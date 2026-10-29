/**
 * Run every catalog workflow against the demo sandbox with the configured provider and
 * report status, tools used, deliverables, cost and time. Use it before sending links to
 * real prospects, after a model change, or after editing prompts.
 *
 *   AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... npx tsx scripts/real-check.ts
 *   npx tsx scripts/real-check.ts --only order-care-agent,data-chat --max-usd 2
 *   npx tsx scripts/real-check.ts --mock          # dry run of the script itself, no key needed
 *   npx tsx scripts/real-check.ts --industry "Sản xuất bao bì"   # on generated data for that industry
 *
 * Writes a Markdown report to reports/real-check-<timestamp>.md. Exit code 1 if any run failed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../server/app.ts';
import { loadDotEnv, readConfig } from '../server/config.ts';
import { createProvider } from '../server/providers/index.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import { resolveWorkflows } from '../server/workflows.ts';
import { applyGeneratedData, heuristicBlueprint } from '../server/datagen/index.ts';
import { sampleInputs } from '../shared/engine/template.ts';
import type { Run, RunEvent } from '../shared/types.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

loadDotEnv();
const config = { ...readConfig(), rateLimit: false };
const useMock = flag('mock');
if (!useMock && config.provider !== 'anthropic') {
  console.error('No real provider configured. Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY (in .env or the environment), or pass --mock for a dry run.');
  process.exit(2);
}
const provider = useMock ? new MockProvider(0) : createProvider(config);
const maxUsd = Number(opt('max-usd') ?? 5);
const only = opt('only')?.split(',').map((s) => s.trim()).filter(Boolean);
const lang = (opt('lang') === 'en' ? 'en' : 'vi') as 'vi' | 'en';
const industry = opt('industry');

const store = new Store(null);
const ws = store.getWorkspaceByToken('demo')!;
ws.credits.total = 10_000;
ws.budgetUsd = 1000;
if (industry) {
  const blueprint = heuristicBlueprint({ company: opt('company') ?? 'Công ty Thử Nghiệm', industry, notes: '', headers: '' });
  applyGeneratedData(ws, blueprint, { mode: 'replace' });
}
store.upsertWorkspace(ws);
const app = createApp({ store, provider, config, uploads: new UploadStore(null), filesDir: null });

interface Row { id: string; kind: string; status: 'ok' | 'warn' | 'fail'; seconds: number; costUsd: number; tools: string; toolErrors: number; deliverables: string; actions: number; notes: string[] }

async function runOne(wfId: string, kind: 'form' | 'chat', inputs: Record<string, string>, starter: string): Promise<{ run?: Run; error?: string; seconds: number }> {
  const started = Date.now();
  const body = kind === 'form'
    ? { workflowId: wfId, lang, sessionId: 'real-check', visitorName: 'real-check', inputs }
    : { workflowId: wfId, lang, sessionId: 'real-check', visitorName: 'real-check', messages: [{ role: 'user', content: starter }] };
  const res = await app.request(`/api/sandbox/demo/${kind === 'form' ? 'runs' : 'chat'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) return { error: `${res.status} ${await res.text()}`, seconds: (Date.now() - started) / 1000 };
  const text = await res.text();
  const events = text.split('\n\n').map((ch) => ch.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
  const done = events.find((e) => e.type === 'run.done');
  const err = events.find((e) => e.type === 'error');
  const seconds = (Date.now() - started) / 1000;
  if (done && done.type === 'run.done') return { run: done.run, seconds };
  return { error: err && err.type === 'error' ? `${err.code ?? ''} ${err.message}` : 'no run.done event', seconds };
}

const workflows = resolveWorkflows(ws).filter((w) => !only || only.includes(w.id));
console.log(`Provider: ${provider.name} (${provider.model}) · ${workflows.length} workflows · lang=${lang} · stop at $${maxUsd}${industry ? ` · generated data: ${industry}` : ''}\n`);
const rows: Row[] = [];
let total = 0;
for (const wf of workflows) {
  if (total >= maxUsd) {
    rows.push({ id: wf.id, kind: wf.kind, status: 'warn', seconds: 0, costUsd: 0, tools: '', toolErrors: 0, deliverables: '', actions: 0, notes: [`skipped: spend reached $${total.toFixed(2)}`] });
    continue;
  }
  const starter = wf.chat?.starters[0]?.[lang] ?? 'Xin chào';
  const r = await runOne(wf.id, wf.kind, sampleInputs(wf, ws.overrides[wf.id]), starter);
  const notes: string[] = [];
  let status: Row['status'] = 'ok';
  if (r.error || !r.run) {
    rows.push({ id: wf.id, kind: wf.kind, status: 'fail', seconds: r.seconds, costUsd: 0, tools: '', toolErrors: 0, deliverables: '', actions: 0, notes: [r.error ?? 'unknown error'] });
    console.log(`✗ ${wf.id.padEnd(24)} ${r.error}`);
    continue;
  }
  const run = r.run;
  total += run.costUsd;
  const isAgent = wf.steps.some((s) => s.agent) || !!wf.chat?.agent;
  const wantsArtifact = wf.steps.some((s) => s.agent?.tools.includes('create_artifact')) || !!wf.chat?.agent?.tools.includes('create_artifact');
  const toolNames = [...new Set(run.trace.map((t) => t.tool))];
  const toolErrors = run.trace.filter((t) => t.isError).length;
  if (run.status !== 'done') { status = 'fail'; notes.push(run.error ?? 'run not done'); }
  if (isAgent && !run.trace.length) { status = 'fail'; notes.push('agent called no tools'); }
  if (wantsArtifact && wf.kind === 'form' && !run.artifacts.length) { status = status === 'fail' ? status : 'warn'; notes.push('no deliverable created'); }
  if (toolErrors) { status = status === 'fail' ? status : 'warn'; notes.push(`${toolErrors} tool error(s)`); }
  if (lang === 'vi' && !/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(run.output)) { status = status === 'fail' ? status : 'warn'; notes.push('answer may not be in Vietnamese'); }
  if (!run.output.trim()) { status = 'fail'; notes.push('empty answer'); }
  rows.push({
    id: wf.id, kind: wf.kind, status, seconds: r.seconds, costUsd: run.costUsd, tools: toolNames.join(' '), toolErrors,
    deliverables: run.artifacts.map((a) => `${a.kind}:${a.title}`).join('; '), actions: run.actions.length, notes,
  });
  console.log(`${status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗'} ${wf.id.padEnd(24)} ${r.seconds.toFixed(1).padStart(6)}s  $${run.costUsd.toFixed(4)}  tools=${run.trace.length} art=${run.artifacts.length} act=${run.actions.length}${notes.length ? `  · ${notes.join('; ')}` : ''}`);
}

const ok = rows.filter((r) => r.status === 'ok').length;
const failed = rows.filter((r) => r.status === 'fail');
const avg = rows.filter((r) => r.costUsd > 0);
const summary = `${ok}/${rows.length} ok, ${rows.filter((r) => r.status === 'warn').length} warnings, ${failed.length} failed · total $${total.toFixed(4)} · average $${(avg.reduce((n, r) => n + r.costUsd, 0) / Math.max(1, avg.length)).toFixed(4)} per run`;
console.log(`\n${summary}`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const md = `# Real-provider check ${stamp}

Provider **${provider.name}** · model \`${provider.model}\` · language ${lang}${industry ? ` · generated data for "${industry}"` : ' · demo data'}

**${summary}**

| Workflow | Kind | Status | Time (s) | Cost (USD) | Tools | Deliverables | Actions | Notes |
|---|---|---|---:|---:|---|---|---:|---|
${rows.map((r) => `| ${r.id} | ${r.kind} | ${r.status} | ${r.seconds.toFixed(1)} | ${r.costUsd.toFixed(4)} | ${r.tools} | ${r.deliverables.replace(/\|/g, '/')} | ${r.actions} | ${r.notes.join('; ').replace(/\|/g, '/')} |`).join('\n')}

Budget planning: a prospect who runs every workflow once costs about $${total.toFixed(2)}; the default cap is $${config.defaultBudgetUsd}.
`;
const out = path.resolve('reports', `real-check-${stamp}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`Report: ${path.relative(process.cwd(), out)}`);
process.exit(failed.length ? 1 : 0);
