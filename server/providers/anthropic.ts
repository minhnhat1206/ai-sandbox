import Anthropic from '@anthropic-ai/sdk';
import type { UploadMeta } from '../../shared/types.ts';
import type { AgentHooks, AgentRequest, CompletionRequest, CompletionResult, Provider, TextAttachment } from './types.ts';
import { ProviderError } from './types.ts';

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
}

type BetaParams = Anthropic.Beta.MessageCreateParamsStreaming;
type BetaTool = NonNullable<BetaParams['tools']>[number];
type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaContentBlockParam = Anthropic.Beta.BetaContentBlockParam;

const FALLBACK_BETAS = ['server-side-fallback-2026-07-01'];
const WEB_SEARCH_TOOL = { type: 'web_search_20260209', name: 'web_search', max_uses: 5 } as const;
const CODE_EXECUTION_TOOL = { type: 'code_execution_20260521', name: 'code_execution' } as const;

/**
 * Real Claude provider. Every run is billed to the founder's key, which is the
 * whole point of the sandbox: the prospect needs no account of their own.
 * Server-side refusal fallbacks are enabled so a safety decline on the primary
 * model is retried automatically on a fallback model inside the same call.
 */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  readonly model: string;
  readonly isDemo = false;
  private readonly client: Anthropic;
  private readonly effort: AnthropicProviderOptions['effort'];

  constructor(opts: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 });
    this.model = opts.model;
    this.effort = opts.effort;
  }

  private async userContent(text: string, attachments: UploadMeta[] | undefined, getBytes?: (id: string) => Buffer | undefined): Promise<BetaContentBlockParam[]> {
    const blocks: BetaContentBlockParam[] = [];
    for (const a of attachments ?? []) {
      const bytes = getBytes?.(a.id);
      if (!bytes) continue;
      if (a.mime === 'application/pdf') {
        blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') }, title: a.name });
      } else if (a.mime.startsWith('image/')) {
        blocks.push({ type: 'image', source: { type: 'base64', media_type: a.mime as 'image/png' | 'image/jpeg', data: bytes.toString('base64') } });
      } else if (a.text) {
        blocks.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: a.text }, title: a.name });
      }
    }
    blocks.push({ type: 'text', text });
    return blocks;
  }

  async complete(req: CompletionRequest, onDelta: (t: string) => void, signal?: AbortSignal): Promise<CompletionResult> {
    try {
      const messages: BetaMessageParam[] = req.messages.map((m) => ({ role: m.role, content: m.content }));
      if (req.attachments?.length && messages.length) {
        const last = messages[messages.length - 1];
        last.content = await this.userContent(typeof last.content === 'string' ? last.content : '', req.attachments, req.getBytes);
      }
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          max_tokens: req.maxTokens ?? 8000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages,
          output_config: { effort: this.effort },
          betas: FALLBACK_BETAS,
          fallbacks: 'default',
        },
        { signal },
      );
      let text = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          onDelta(event.delta.text);
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') throw new ProviderError('The model declined this request for safety reasons.', 'refusal');
      return { text, inputTokens: countInput(final.usage), outputTokens: final.usage.output_tokens ?? 0, cacheReadTokens: final.usage.cache_read_input_tokens ?? 0 };
    } catch (err) {
      throw toProviderError(err);
    }
  }

  /**
   * Manual agentic loop (streaming). Custom tools run through hooks.executeTool;
   * `web_search` becomes the Anthropic server tool; Agent Skills run server-side
   * with code execution and the produced files are downloaded via the Files API;
   * MCP servers are attached through the MCP connector.
   */
  async runAgent(req: AgentRequest, hooks: AgentHooks, signal?: AbortSignal): Promise<CompletionResult> {
    const betas = [...FALLBACK_BETAS];
    const tools: BetaTool[] = [];
    const wantsWeb = req.toolNames.includes('web_search');
    const wantsSkills = req.skills.length > 0;
    for (const def of req.tools) {
      if (def.name === 'web_search') continue; // replaced by the server tool below
      tools.push({ name: def.name, description: def.description, input_schema: def.input_schema, eager_input_streaming: true } as BetaTool);
    }
    // web search (dynamic filtering) already runs code execution internally; never declare both.
    if (wantsWeb) tools.push(WEB_SEARCH_TOOL as unknown as BetaTool);
    else if (wantsSkills) {
      tools.push(CODE_EXECUTION_TOOL as unknown as BetaTool);
      betas.push('code-execution-2025-08-25');
    }
    const mcpServers = req.mcpServers.map((s) => ({ type: 'url' as const, url: s.url, name: s.name, ...(s.authToken ? { authorization_token: s.authToken } : {}) }));
    if (mcpServers.length) {
      betas.push('mcp-client-2025-11-20');
      for (const s of mcpServers) tools.push({ type: 'mcp_toolset', mcp_server_name: s.name } as unknown as BetaTool);
    }

    const messages: BetaMessageParam[] = [];
    for (const m of req.messages) messages.push({ role: m.role, content: m.content });
    if (messages.length) {
      const last = messages[messages.length - 1];
      last.content = await this.userContent(typeof last.content === 'string' ? last.content : '', req.attachments, req.getBytes);
    }

    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let container: string | undefined;
    try {
      for (let turn = 0; turn < req.maxTurns + 2; turn++) {
        const params = {
          model: this.model,
          max_tokens: req.maxTokens ?? 16000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages,
          tools,
          output_config: { effort: this.effort },
          betas,
          fallbacks: 'default',
          ...(mcpServers.length ? { mcp_servers: mcpServers } : {}),
          ...(wantsSkills && !wantsWeb
            ? { container: container ? { id: container, skills: skillList(req.skills) } : { skills: skillList(req.skills) } }
            : {}),
        } as unknown as BetaParams;
        const stream = this.client.beta.messages.stream(params, { signal });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            text += event.delta.text;
            hooks.onText(event.delta.text);
          }
        }
        const message = await stream.finalMessage();
        inputTokens += countInput(message.usage);
        outputTokens += message.usage.output_tokens ?? 0;
        cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
        if (message.container?.id) container = message.container.id;
        await this.collectFiles(message, hooks);

        if (message.stop_reason === 'refusal') throw new ProviderError('The model declined this request for safety reasons.', 'refusal');
        if (message.stop_reason === 'pause_turn') {
          messages.push({ role: 'assistant', content: message.content });
          continue;
        }
        const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
        if (message.stop_reason === 'max_tokens' && toolUses.length) throw new ProviderError('Tool input was truncated (max_tokens).', 'unknown');
        if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break;
        messages.push({ role: 'assistant', content: message.content });
        text += '\n';
        const results: BetaContentBlockParam[] = [];
        for (const tu of toolUses) {
          const id = tu.id;
          hooks.onToolCall(id, tu.name, tu.input);
          const started = Date.now();
          const r = await hooks.executeTool(tu.name, tu.input);
          hooks.onToolResult(id, r.output, !!r.isError, Date.now() - started);
          results.push({ type: 'tool_result', tool_use_id: id, content: r.output.slice(0, 60_000), is_error: !!r.isError });
        }
        messages.push({ role: 'user', content: results });
      }
      return { text: text.trim(), inputTokens, outputTokens, cacheReadTokens };
    } catch (err) {
      throw toProviderError(err);
    }
  }

  private async collectFiles(message: Anthropic.Beta.BetaMessage, hooks: AgentHooks): Promise<void> {
    for (const block of message.content) {
      if (block.type !== 'bash_code_execution_tool_result') continue;
      const result = block.content;
      if (!result || result.type !== 'bash_code_execution_result' || !result.content) continue;
      for (const ref of result.content) {
        if (ref.type !== 'bash_code_execution_output') continue;
        try {
          const meta = await this.client.beta.files.retrieveMetadata(ref.file_id);
          const res = await this.client.beta.files.download(ref.file_id);
          const bytes = Buffer.from(await res.arrayBuffer());
          hooks.onFile({ filename: meta.filename, mime: meta.mime_type ?? 'application/octet-stream', bytes });
        } catch (err) {
          console.warn('[anthropic] could not download generated file:', err instanceof Error ? err.message : err);
        }
      }
    }
  }

  async completeText(system: string, user: string, maxTokens = 8000, attachments: TextAttachment[] = []): Promise<string> {
    try {
      const content: BetaContentBlockParam[] = [];
      for (const a of attachments) {
        if (a.mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.bytes.toString('base64') }, title: a.name });
        else if (a.mime.startsWith('image/')) content.push({ type: 'image', source: { type: 'base64', media_type: a.mime as 'image/png' | 'image/jpeg', data: a.bytes.toString('base64') } });
        else if (a.text) content.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: a.text }, title: a.name });
      }
      content.push({ type: 'text', text: user });
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content }],
        output_config: { effort: this.effort },
        betas: FALLBACK_BETAS,
        fallbacks: 'default',
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') throw new ProviderError('The model declined this request.', 'refusal');
      return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    } catch (err) {
      throw toProviderError(err);
    }
  }
}

function skillList(skills: string[]) {
  return skills.map((skill_id) => ({ type: 'anthropic' as const, skill_id, version: 'latest' as const }));
}

function countInput(usage: Anthropic.Beta.BetaUsage): number {
  return (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new ProviderError('Invalid Anthropic API key.', 'auth');
  if (err instanceof Anthropic.RateLimitError) return new ProviderError('Rate limited by the AI provider. Please try again in a minute.', 'rate_limit');
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError('Could not reach the AI provider.', 'network');
  if (err instanceof Anthropic.APIError) return new ProviderError(`AI provider error (${err.status}): ${err.message}`, 'unknown');
  return new ProviderError(err instanceof Error ? err.message : 'Unknown provider error', 'unknown');
}
