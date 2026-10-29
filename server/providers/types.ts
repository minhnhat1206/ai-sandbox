import type { ChatMessage, Lang, McpServer, SkillName, ToolName, UploadMeta } from '../../shared/types.ts';
import type { ToolDefinition } from '../tools/registry.ts';

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Uploaded files attached to the last user message (documents/images). */
  attachments?: UploadMeta[];
  /** Resolve the raw bytes of an attachment (used to build document/image blocks). */
  getBytes?: (id: string) => Buffer | undefined;
  /** Hints for the mock provider so demo output looks like the real thing. */
  meta: { workflowId: string; stepId: string; lang: Lang; inputs: Record<string, string> };
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentRequest extends CompletionRequest {
  tools: ToolDefinition[];
  toolNames: ToolName[];
  skills: SkillName[];
  mcpServers: McpServer[];
  maxTurns: number;
}

export interface AgentHooks {
  onText: (delta: string) => void;
  /** Called before a tool runs; returns the id used for onToolResult. */
  onToolCall: (id: string, tool: string, input: unknown) => void;
  onToolResult: (id: string, output: string, isError: boolean, durationMs: number) => void;
  /** Execute a registered server-side tool. */
  executeTool: (tool: string, input: unknown) => Promise<{ output: string; isError?: boolean }>;
  /** A file produced by the provider (Agent Skills / code execution). */
  onFile: (file: { filename: string; mime: string; bytes: Buffer }) => void;
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  readonly isDemo: boolean;
  /** Stream text deltas via onDelta and resolve with the full result. */
  complete(req: CompletionRequest, onDelta: (text: string) => void, signal?: AbortSignal): Promise<CompletionResult>;
  /** Agent loop: the model may call tools until it answers. */
  runAgent(req: AgentRequest, hooks: AgentHooks, signal?: AbortSignal): Promise<CompletionResult>;
  /** Non-streaming helper used for admin tooling (e.g. drafting a workflow). */
  completeText(system: string, user: string, maxTokens?: number): Promise<string>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly code: 'auth' | 'rate_limit' | 'refusal' | 'network' | 'unknown' = 'unknown') {
    super(message);
    this.name = 'ProviderError';
  }
}
