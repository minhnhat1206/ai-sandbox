import { useState } from 'react';
import type { Action, Artifact, ToolCall } from '@shared/types';
import { Badge, Button, Tabs } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang, type DictKeyLoose } from '@/i18n';
import { Markdown } from '@/lib/markdown';

const TOOL_ICON: Record<string, string> = {
  query_records: 'Table', aggregate_records: 'BarChart3', search_knowledge: 'book', create_ticket: 'ClipboardList',
  draft_email: 'Mail', calculate: 'Calculator', create_artifact: 'FileText', web_search: 'Globe',
};

function summarizeInput(tool: string, input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const i = input as Record<string, unknown>;
  switch (tool) {
    case 'query_records': return `${i.source}${Array.isArray(i.where) && i.where.length ? ' · ' + (i.where as { field: string; op: string; value: unknown }[]).map((w) => `${w.field} ${w.op} ${Array.isArray(w.value) ? w.value.join(',') : w.value}`).join(', ') : ''}${i.search ? ` · "${i.search}"` : ''}`;
    case 'aggregate_records': return `${i.source}${i.groupBy ? ` · theo ${i.groupBy}` : ''} · ${Array.isArray(i.metrics) ? (i.metrics as { fn: string; field?: string }[]).map((m) => `${m.fn}(${m.field ?? ''})`).join(', ') : ''}`;
    case 'search_knowledge': case 'web_search': return `"${i.query}"`;
    case 'create_ticket': return `${i.priority ?? ''} · ${i.subject ?? ''}`;
    case 'draft_email': return `→ ${i.to ?? ''} · ${i.subject ?? ''}`;
    case 'calculate': return String(i.expression ?? '');
    case 'create_artifact': return `${i.kind} · ${i.title}`;
    default: return JSON.stringify(input).slice(0, 120);
  }
}

function summarizeOutput(tool: string, output?: string): string {
  if (!output) return '';
  try {
    const o = JSON.parse(output) as Record<string, unknown>;
    if (typeof o.count === 'number') return `${o.count} ${tool === 'search_knowledge' ? 'passages' : 'rows'}`;
    if (o.ticketId) return String(o.ticketId);
    if (o.draftId) return String(o.draftId);
    if (o.value !== undefined) return `= ${o.value}`;
    if (o.artifactId) return 'ok';
    if (o.note) return String(o.note).slice(0, 80);
  } catch { /* plain text */ }
  return output.slice(0, 80);
}

export function AgentTimeline({ trace, running }: { trace: ToolCall[]; running: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  if (!trace.length) return null;
  return (
    <section className="rounded-xl2 bg-white p-4 hairline shadow-[var(--shadow-card)] animate-rise">
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-jade-12">
        <Icon name="bolt" size={15} className="text-jade-9" /> {running ? t('run_timeline') : t('run_timeline_done')}
        <span className="ml-auto font-mono text-[11px] font-medium text-sand-9">{trace.length}</span>
      </h3>
      <ol className="mt-3 space-y-1.5">
        {trace.map((c, i) => {
          const pending = c.output === undefined;
          const isOpen = open === c.id;
          return (
            <li key={c.id} className="animate-rise">
              <button onClick={() => setOpen(isOpen ? null : c.id)} className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-sand-2 ${isOpen ? 'bg-sand-2' : ''}`}>
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.isError ? 'bg-coral-3 text-coral-11' : pending ? 'bg-sand-3 text-sand-9' : 'bg-jade-3 text-jade-10'}`}>
                  {pending ? <Icon name="loader" size={14} /> : <Icon name={TOOL_ICON[c.tool] ?? 'Sparkles'} size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-sand-12">
                    <span className="font-mono text-[10px] text-sand-8">{String(i + 1).padStart(2, '0')}</span>
                    {t(`tool_${c.tool}` as DictKeyLoose, undefined, t('tool_generic'))}
                    {c.durationMs !== undefined && <span className="font-mono text-[10px] font-medium text-sand-8">{c.durationMs} ms</span>}
                  </span>
                  <span className="block truncate text-[12.5px] text-sand-10">{summarizeInput(c.tool, c.input)}</span>
                </span>
                <span className={`shrink-0 text-[11.5px] font-medium ${c.isError ? 'text-coral-11' : 'text-jade-11'}`}>{summarizeOutput(c.tool, c.output)}</span>
              </button>
              {isOpen && (
                <div className="mx-2.5 mb-2 grid gap-2 rounded-xl bg-ink-900 p-3 text-[11.5px] text-sand-2 md:grid-cols-2 animate-fade">
                  <div><p className="eyebrow mb-1 text-jade-5">Input</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(c.input, null, 2)}</pre></div>
                  <div><p className="eyebrow mb-1 text-jade-5">Output</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono">{pretty(c.output)}</pre></div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function pretty(s?: string): string {
  if (!s) return '…';
  try { return JSON.stringify(JSON.parse(s), null, 2).slice(0, 4000); } catch { return s.slice(0, 4000); }
}

/** Thousands separators for numbers (vi-VN), raw text otherwise. */
function formatCell(v: unknown): string {
  if (typeof v === 'number') return Number.isInteger(v) ? new Intl.NumberFormat('vi-VN').format(v) : String(v);
  return String(v ?? '');
}

const KIND_ICON: Record<Artifact['kind'], string> = { html: 'LineChart', table: 'Table', markdown: 'FileText', csv: 'Table', json: 'Calculator', file: 'paperclip' };

export function ArtifactsPanel({ artifacts, urlFor }: { artifacts: Artifact[]; urlFor: (a: Artifact, download?: boolean) => string }) {
  const { t } = useLang();
  const [active, setActive] = useState<string>(artifacts[0]?.id ?? '');
  if (!artifacts.length) return null;
  const current = artifacts.find((a) => a.id === active) ?? artifacts[0];
  return (
    <section className="overflow-hidden rounded-xl2 bg-white hairline shadow-[var(--shadow-card)] animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-4 px-4 py-3">
        <h3 className="flex items-center gap-2 text-[13px] font-bold text-jade-12"><Icon name="Package" size={15} className="text-jade-9" /> {t('run_deliverables')} <span className="font-mono text-[11px] font-medium text-sand-9">{artifacts.length}</span></h3>
        <div className="flex gap-1">
          {current.kind === 'html' && <a href={urlFor(current)} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="external">{t('run_open_new_tab')}</Button></a>}
          <a href={urlFor(current, true)} download><Button size="sm" variant="secondary" icon="arrowRight">{t('run_download')}</Button></a>
        </div>
      </div>
      <div className="px-4 pt-3">
        <Tabs tabs={artifacts.map((a) => ({ id: a.id, label: a.title.length > 28 ? `${a.title.slice(0, 26)}…` : a.title, icon: KIND_ICON[a.kind] }))} value={current.id} onChange={setActive} />
      </div>
      <div className="p-4">
        {current.kind === 'html' && (
          <iframe key={current.id} title={current.title} src={urlFor(current)} sandbox="" className="h-[560px] w-full rounded-xl bg-white hairline" />
        )}
        {current.kind === 'table' && current.columns && (
          <div className="max-h-[480px] overflow-auto rounded-xl hairline">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-sand-3"><tr>{current.columns.map((c) => <th key={c} className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-sand-11">{c}</th>)}</tr></thead>
              <tbody>{(current.rows ?? []).map((r, i) => <tr key={i} className="border-t border-sand-4 odd:bg-white even:bg-sand-1">{current.columns!.map((c) => <td key={c} className={`px-3 py-1.5 align-top tnum ${typeof r[c] === 'number' ? 'text-right' : ''}`}>{formatCell(r[c])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {current.kind === 'markdown' && <div className="paper rounded-xl p-5"><Markdown text={current.content ?? ''} /></div>}
        {(current.kind === 'csv' || current.kind === 'json') && <pre className="max-h-[480px] overflow-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] leading-relaxed text-sand-2">{current.content}</pre>}
        {current.kind === 'file' && (
          <div className="flex items-center gap-4 rounded-xl bg-sand-2 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-jade-12 text-white"><Icon name="paperclip" size={22} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-jade-12">{current.filename}</p><p className="text-[12px] text-sand-9">{current.mime} · {Math.round((current.size ?? 0) / 1024)} KB</p></div>
            <a href={urlFor(current, true)} download><Button icon="arrowRight">{t('run_download')}</Button></a>
          </div>
        )}
      </div>
    </section>
  );
}

export function ActionsPanel({ actions }: { actions: Action[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  if (!actions.length) return null;
  return (
    <section className="rounded-xl2 bg-white p-4 hairline shadow-[var(--shadow-card)] animate-rise">
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-jade-12"><Icon name="ClipboardList" size={15} className="text-jade-9" /> {t('run_actions')} <span className="font-mono text-[11px] font-medium text-sand-9">{actions.length}</span></h3>
      <p className="mt-1 text-[12px] text-sand-9">{t('run_actions_hint')}</p>
      <ul className="mt-3 space-y-2">
        {actions.map((a) => {
          const isOpen = open === a.id;
          const p = a.payload as Record<string, string>;
          return (
            <li key={a.id} className="rounded-xl bg-sand-2">
              <button onClick={() => setOpen(isOpen ? null : a.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <Badge tone={a.type === 'ticket' ? 'warn' : 'info'} dot>{t(a.type === 'ticket' ? 'action_ticket' : 'action_email')}</Badge>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-sand-12">{a.summary}</span>
                <code className="font-mono text-[11px] text-sand-9">{a.id}</code>
                <Icon name="chevronDown" size={14} className={`text-sand-8 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-sand-4 px-4 py-3 text-[13px] animate-fade">
                  {a.type === 'email' ? (
                    <div className="paper rounded-lg p-4">
                      <p className="text-[12px] text-sand-9">To: <strong className="text-sand-12">{p.to}</strong>{p.cc && <> · Cc: {p.cc}</>}</p>
                      <p className="mt-1 font-semibold text-jade-12">{p.subject}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sand-12">{p.body}</p>
                    </div>
                  ) : (
                    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[120px_1fr]">
                      {Object.entries(p).filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-[12px] font-semibold uppercase tracking-wider text-sand-9">{k}</dt><dd className="whitespace-pre-wrap text-sand-12">{v}</dd></div>)}
                    </dl>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Capability badges shown on gallery cards and run headers. */
export function capabilitiesOf(wf: { steps: { agent?: { tools: string[]; skills?: string[] } }[]; inputs: { type: string }[]; chat?: { agent?: { tools: string[]; skills?: string[] } } }, connectors = 0): string[] {
  const caps = new Set<string>();
  for (const s of [...wf.steps, ...(wf.chat ? [wf.chat] : [])]) {
    if (!s.agent) continue;
    caps.add('cap_agent');
    if (s.agent.tools.some((t) => t === 'query_records' || t === 'aggregate_records')) caps.add('cap_data');
    if (s.agent.tools.some((t) => t === 'create_ticket' || t === 'draft_email')) caps.add('cap_actions');
    if (s.agent.tools.includes('create_artifact')) caps.add('cap_artifacts');
    if (s.agent.tools.includes('web_search')) caps.add('cap_web');
    if (s.agent.skills?.length) caps.add('cap_skill');
    if (connectors > 0) caps.add('cap_mcp');
  }
  if (wf.inputs.some((i) => i.type === 'file')) caps.add('cap_file');
  return [...caps];
}

export const CAP_ICON: Record<string, string> = { cap_agent: 'Bot', cap_data: 'Table', cap_actions: 'ClipboardList', cap_artifacts: 'LineChart', cap_web: 'Globe', cap_skill: 'Calculator', cap_mcp: 'Globe', cap_file: 'paperclip' };
