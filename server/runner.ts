import { buildContext, renderTemplate, validateInputs } from '../shared/engine/template.ts';
import { estimateCostUsd } from '../shared/engine/pricing.ts';
import type { ChatMessage, Lang, Run, RunEvent, RunStepResult, WorkflowDef, Workspace } from '../shared/types.ts';
import { nowIso, shortId } from './ids.ts';
import type { Provider } from './providers/types.ts';
import { ProviderError } from './providers/types.ts';

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
    startedAt: nowIso(),
  };
}

/**
 * Execute a form workflow step by step. Emits streaming events, returns the
 * completed Run. Throws RunError for validation problems before anything runs.
 */
export async function runWorkflow(
  req: RunRequest,
  provider: Provider,
  emit: (e: RunEvent) => void | Promise<void>,
  opts: { creditsRemaining: number; signal?: AbortSignal; onRunCreated?: (run: Run) => void },
): Promise<Run> {
  const { workflow, workspace } = req;
  if (workflow.kind !== 'form') throw new RunError('This workflow is a chat agent; use the chat endpoint.', 'wrong_kind');
  const errors = validateInputs(workflow.inputs, req.inputs);
  if (errors.length) throw new RunError(errors.map((e) => e.message[req.lang]).join('; '), 'validation');

  const run = baseRun(req, provider);
  opts.onRunCreated?.(run);
  await emit({ type: 'run.started', runId: run.id, creditsRemaining: opts.creditsRemaining });

  const ctx = buildContext(workspace, req.lang, req.inputs, !!workflow.useKnowledge);
  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      await emit({ type: 'step.started', stepId: step.id, title: step.title, index: i, total: workflow.steps.length });
      const started = Date.now();
      let buffer = '';
      const result = await provider.complete(
        {
          system: renderTemplate(step.system, ctx),
          messages: [{ role: 'user', content: renderTemplate(step.prompt, ctx) }],
          maxTokens: step.maxTokens,
          meta: { workflowId: workflow.id, stepId: step.id, lang: req.lang, inputs: req.inputs },
        },
        (text) => {
          buffer += text;
          void emit({ type: 'step.delta', stepId: step.id, text });
        },
        opts.signal,
      );
      const stepResult: RunStepResult = {
        id: step.id,
        title: step.title,
        output: result.text || buffer,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - started,
      };
      run.steps.push(stepResult);
      ctx.steps[step.id] = stepResult.output;
      run.inputTokens += result.inputTokens;
      run.outputTokens += result.outputTokens;
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
export async function runChat(
  req: ChatRequest,
  provider: Provider,
  emit: (e: RunEvent) => void | Promise<void>,
  opts: { creditsRemaining: number; signal?: AbortSignal; onRunCreated?: (run: Run) => void },
): Promise<Run> {
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
