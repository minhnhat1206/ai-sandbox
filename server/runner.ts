import { buildContext, renderTemplate, validateInputs } from '../shared/engine/template.ts';
import { estimateCostUsd } from '../shared/engine/pricing.ts';
import type { Action, Artifact, ChatMessage, Lang, Run, RunEvent, RunStepResult, ToolCall, UploadMeta, WorkflowDef, WorkflowStep, Workspace } from '../shared/types.ts';
import { nowIso, shortId } from './ids.ts';
import type { Provider } from './providers/types.ts';
import { ProviderError } from './providers/types.ts';
import { buildTables, describeSources, executeTool, TOOL_DEFINITIONS, type ToolContext } from './tools/registry.ts';

export interface RunRequest {
  workspace: Workspace;
  workflow: WorkflowDef;
  inputs: Record<string, string>;
  lang: Lang;
  sessionId: string;
  visitorName: string;
}

export interface ChatRequest extends Omit<RunRequest, 'inputs'> {
  messages: ChatMessage[];
}

export interface RunOptions {
  creditsRemaining: number;
  signal?: AbortSignal;
  onRunCreated?: (run: Run) => void;
  /** Resolve uploaded files referenced by file inputs. */
  getUpload?: (id: string) => { meta: UploadMeta; bytes: Buffer } | undefined;
  /** Persist a provider-generated file and return the artifact describing it. */
  saveFile?: (run: Run, file: { filename: string; mime: string; bytes: Buffer }) => Artifact;
}

export class RunError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

function baseRun(req: Omit<RunRequest, 'inputs'> & { inputs: Record<string, string> }, provider: Provider): Run {
  return {
    id: `run_${shortId()}`,
    workspaceId: req.workspace.id,
    workflowId: req.workflow.id,
    workflowName: req.workflow.name,
    kind: req.workflow.kind,
    sessionId: req.sessionId,
    visitorName: req.visitorName,
    lang: req.lang,
    inputs: req.inputs,
    steps: [],
    output: '',
    status: 'running',
    provider: provider.name,
    model: provider.model,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    minutesSaved: req.workflow.minutesSavedPerRun,
    trace: [],
    artifacts: [],
    actions: [],
    startedAt: nowIso(),
  };
}

/** File inputs hold upload ids; resolve them to attachments and show names in the prompt. */
function collectAttachments(wf: WorkflowDef, inputs: Record<string, string>, opts: RunOptions): { attachments: UploadMeta[]; promptInputs: Record<string, string> } {
  const attachments: UploadMeta[] = [];
  const promptInputs = { ...inputs };
  for (const f of wf.inputs) {
    if (f.type !== 'file') continue;
    const id = inputs[f.key];
    if (!id) { promptInputs[f.key] = '(no file attached)'; continue; }
    const up = opts.getUpload?.(id);
    if (!up) { promptInputs[f.key] = '(file not found)'; continue; }
    attachments.push(up.meta);
    promptInputs[f.key] = `[attached file: ${up.meta.name}, ${up.meta.mime}, ${Math.round(up.meta.size / 1024)} KB]`;
  }
  return { attachments, promptInputs };
}

async function runStep(
  step: WorkflowStep,
  wf: WorkflowDef,
  ws: Workspace,
  run: Run,
  ctx: ReturnType<typeof buildContext>,
  provider: Provider,
  emit: (e: RunEvent) => void | Promise<void>,
  opts: RunOptions,
  attachments: UploadMeta[],
): Promise<RunStepResult> {
  const started = Date.now();
  let buffer = '';
  const onText = (text: string) => {
    buffer += text;
    void emit({ type: 'step.delta', stepId: step.id, text });
  };
  const meta = { workflowId: wf.id, stepId: step.id, lang: run.lang, inputs: run.inputs };
  const getBytes = (id: string) => opts.getUpload?.(id)?.bytes;

  if (!step.agent) {
    const result = await provider.complete(
      { system: renderTemplate(step.system, ctx), messages: [{ role: 'user', content: renderTemplate(step.prompt, ctx) }], maxTokens: step.maxTokens, attachments, getBytes, meta },
      onText,
      opts.signal,
    );
    return { id: step.id, title: step.title, output: result.text || buffer, inputTokens: result.inputTokens, outputTokens: result.outputTokens, durationMs: Date.now() - started };
  }

  // ---- agent step --------------------------------------------------------
  const tables = buildTables(ws);
  const toolCtx: ToolContext = {
    workspace: ws,
    lang: run.lang,
    tables,
    onArtifact: (a) => { run.artifacts.push(a); void emit({ type: 'artifact', artifact: a }); },
    onAction: (a: Action) => { run.actions.push(a); void emit({ type: 'action', action: a }); },
  };
  ctx.sources = describeSources(toolCtx);
  const tools = step.agent.tools.map((t) => TOOL_DEFINITIONS[t]).filter(Boolean);
  const pending = new Map<string, ToolCall>();
  const result = await provider.runAgent(
    {
      system: renderTemplate(step.system, ctx),
      messages: [{ role: 'user', content: renderTemplate(step.prompt, ctx) }],
      maxTokens: step.maxTokens,
      attachments,
      getBytes,
      meta,
      tools,
      toolNames: step.agent.tools,
      skills: step.agent.skills ?? [],
      mcpServers: ws.mcpServers ?? [],
      maxTurns: step.agent.maxTurns ?? 8,
    },
    {
      onText,
      onToolCall: (id, tool, input) => {
        const call: ToolCall = { id, stepId: step.id, tool, input, startedAt: nowIso() };
        pending.set(id, call);
        run.trace.push(call);
        void emit({ type: 'tool.call', call });
      },
      onToolResult: (id, output, isError, durationMs) => {
        const call = pending.get(id);
        if (call) { call.output = output.slice(0, 20_000); call.isError = isError; call.durationMs = durationMs; }
        void emit({ type: 'tool.result', id, output: output.slice(0, 20_000), isError, durationMs });
      },
      executeTool: (tool, input) => executeTool(tool, input, toolCtx),
      onFile: (file) => {
        if (!opts.saveFile) return;
        const artifact = opts.saveFile(run, file);
        run.artifacts.push(artifact);
        void emit({ type: 'artifact', artifact });
      },
    },
    opts.signal,
  );
  return { id: step.id, title: step.title, output: result.text || buffer, inputTokens: result.inputTokens, outputTokens: result.outputTokens, durationMs: Date.now() - started };
}

/**
 * Execute a form workflow step by step. Emits streaming events, returns the
 * completed Run. Throws RunError for validation problems before anything runs.
 */
export async function runWorkflow(req: RunRequest, provider: Provider, emit: (e: RunEvent) => void | Promise<void>, opts: RunOptions): Promise<Run> {
  const { workflow, workspace } = req;
  if (workflow.kind !== 'form') throw new RunError('This workflow is a chat agent; use the chat endpoint.', 'wrong_kind');
  const errors = validateInputs(workflow.inputs, req.inputs);
  if (errors.length) throw new RunError(errors.map((e) => e.message[req.lang]).join('; '), 'validation');

  const run = baseRun(req, provider);
  opts.onRunCreated?.(run);
  await emit({ type: 'run.started', runId: run.id, creditsRemaining: opts.creditsRemaining });

  const { attachments, promptInputs } = collectAttachments(workflow, req.inputs, opts);
  const ctx = buildContext(workspace, req.lang, promptInputs, !!workflow.useKnowledge);
  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      await emit({ type: 'step.started', stepId: step.id, title: step.title, index: i, total: workflow.steps.length });
      const stepResult = await runStep(step, workflow, workspace, run, ctx, provider, emit, opts, i === 0 ? attachments : []);
      run.steps.push(stepResult);
      ctx.steps[step.id] = stepResult.output;
      run.inputTokens += stepResult.inputTokens;
      run.outputTokens += stepResult.outputTokens;
      await emit({ type: 'step.done', stepId: step.id });
    }
    run.output = run.steps.length ? run.steps[run.steps.length - 1].output : '';
    run.status = 'done';
  } catch (err) {
    run.status = 'error';
    run.error = err instanceof Error ? err.message : String(err);
    if (err instanceof ProviderError) throw err;
    throw new RunError(run.error, 'provider');
  } finally {
    run.finishedAt = nowIso();
    run.costUsd = estimateCostUsd(run.model, run.inputTokens, run.outputTokens);
  }
  return run;
}

/** One chat turn. The whole message history is sent each time (stateless). */
export async function runChat(req: ChatRequest, provider: Provider, emit: (e: RunEvent) => void | Promise<void>, opts: RunOptions): Promise<Run> {
  const { workflow, workspace } = req;
  if (workflow.kind !== 'chat' || !workflow.chat) throw new RunError('This workflow is not a chat agent.', 'wrong_kind');
  const messages = req.messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim());
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new RunError('The last message must come from the user.', 'validation');
  if (messages.some((m) => m.content.length > 20000)) throw new RunError('A message is too long (max 20,000 characters).', 'validation');

  const lastUser = messages[messages.length - 1].content;
  const run = baseRun({ ...req, inputs: { message: lastUser } }, provider);
  opts.onRunCreated?.(run);
  await emit({ type: 'run.started', runId: run.id, creditsRemaining: opts.creditsRemaining });
  const ctx = buildContext(workspace, req.lang, {}, !!workflow.useKnowledge);
  const title = { vi: 'Trả lời', en: 'Reply' };
  await emit({ type: 'step.started', stepId: 'chat', title, index: 0, total: 1 });
  const started = Date.now();
  try {
    let buffer = '';
    const result = await provider.complete(
      {
        system: renderTemplate(workflow.chat.system, ctx),
        messages: messages.slice(-20),
        meta: { workflowId: workflow.id, stepId: 'chat', lang: req.lang, inputs: { message: lastUser } },
      },
      (text) => {
        buffer += text;
        void emit({ type: 'step.delta', stepId: 'chat', text });
      },
      opts.signal,
    );
    run.steps.push({ id: 'chat', title, output: result.text || buffer, inputTokens: result.inputTokens, outputTokens: result.outputTokens, durationMs: Date.now() - started });
    run.output = result.text || buffer;
    run.inputTokens = result.inputTokens;
    run.outputTokens = result.outputTokens;
    run.status = 'done';
    await emit({ type: 'step.done', stepId: 'chat' });
  } catch (err) {
    run.status = 'error';
    run.error = err instanceof Error ? err.message : String(err);
    if (err instanceof ProviderError) throw err;
    throw new RunError(run.error, 'provider');
  } finally {
    run.finishedAt = nowIso();
    run.costUsd = estimateCostUsd(run.model, run.inputTokens, run.outputTokens);
  }
  return run;
}
