import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Action, Artifact, ChatMessage, RunEvent, ToolCall } from '@shared/types';
import { ActionsPanel, AgentTimeline, ArtifactsPanel, CAP_ICON, capabilitiesOf } from '@/components/AgentPanel';
import { Mark } from '@/components/Logo';
import { Alert, Button, IconTile, Textarea } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang, type DictKeyLoose } from '@/i18n';
import { ApiError, streamRun } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

/** A chat turn as shown in the UI; only role/content are sent to the server. */
interface Turn extends ChatMessage {
  runId?: string;
  trace?: ToolCall[];
  artifacts?: Artifact[];
  actions?: Action[];
}

export default function ChatAgent() {
  const { id = '' } = useParams();
  const { t, lang, pick } = useLang();
  const { token, view, setCredits } = useSandbox();
  const wf = useMemo(() => view.workflows.find((w) => w.id === id), [view.workflows, id]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, pending]);

  if (!wf || wf.kind !== 'chat' || !wf.chat) return <Alert tone="error">{t('sb_not_found')}</Alert>;
  const caps = capabilitiesOf(wf, view.connectors.length);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setDraft('');
    setError(null);
    setBusy(true);
    let cur: Turn = { role: 'assistant', content: '', trace: [], artifacts: [], actions: [] };
    setPending(cur);
    const update = (patch: Partial<Turn>) => { cur = { ...cur, ...patch }; setPending(cur); };
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamRun(token, 'chat', { workflowId: wf.id, lang, messages: next.map(({ role, content: c }) => ({ role, content: c })) }, (e: RunEvent) => {
        switch (e.type) {
          case 'run.started': setCredits(e.creditsRemaining); update({ runId: e.runId }); break;
          case 'step.delta': update({ content: cur.content + e.text }); break;
          case 'tool.call': update({ trace: [...(cur.trace ?? []), e.call] }); break;
          case 'tool.result': update({ trace: (cur.trace ?? []).map((c) => (c.id === e.id ? { ...c, output: e.output, isError: e.isError, durationMs: e.durationMs } : c)) }); break;
          case 'artifact': update({ artifacts: [...(cur.artifacts ?? []), e.artifact] }); break;
          case 'action': update({ actions: [...(cur.actions ?? []), e.action] }); break;
          case 'run.done':
            setCredits(e.creditsRemaining);
            setTurns((m) => [...m, { ...cur, content: e.run.output, runId: e.run.id }]);
            setPending(null);
            break;
          case 'error': setError(e.code === 'no_credits' ? t('run_error_credits') : e.code === 'no_budget' ? t('run_error_budget') : e.message); break;
        }
      }, ac.signal);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_credits') setError(t('run_error_credits'));
      else if (e instanceof ApiError && e.code === 'no_budget') setError(t('run_error_budget'));
      else if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(draft); };
  const noCredits = view.creditsRemaining <= 0 || view.budgetExhausted;
  const urlFor = (runId?: string) => (a: Artifact, download?: boolean) => `/api/sandbox/${encodeURIComponent(token)}/runs/${runId ?? ''}/artifacts/${a.id}${download ? '?download' : ''}`;

  return (
    <div className="flex h-[calc(100dvh-15.5rem)] min-h-[560px] flex-col gap-3 md:h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/s/${token}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-sand-9 transition hover:text-jade-11"><Icon name="arrowLeft" size={15} /> {t('back')}</Link>
        <Button size="sm" variant="ghost" icon="rotate" onClick={() => { setTurns([]); setPending(null); setError(null); }} disabled={busy || turns.length === 0}>{t('chat_reset')}</Button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl3 bg-white hairline shadow-[var(--shadow-card)] animate-rise">
        <header className="flex items-center gap-3 border-b border-sand-4 bg-sand-1/70 px-5 py-3.5">
          <IconTile name={wf.icon} size="sm" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold text-jade-12">{pick(wf.name)}</h1>
            <p className="truncate text-[12px] text-sand-9">{pick(wf.tagline)} · {t('chat_hint')}</p>
          </div>
          <div className="hidden flex-wrap justify-end gap-1 sm:flex">
            {caps.map((c) => <span key={c} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${c === 'cap_agent' ? 'bg-jade-12 text-white' : 'bg-jade-3 text-jade-11'}`}><Icon name={CAP_ICON[c]} size={11} /> {t(c as DictKeyLoose)}</span>)}
          </div>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 dotfield" aria-live="polite">
          <Bubble role="assistant"><p className="text-[14.5px]">{pick(wf.chat.greeting)}</p></Bubble>
          {turns.length === 0 && !pending && (
            <div className="pl-11 animate-rise delay-2">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-sand-9">{t('chat_starters')}</p>
              <div className="flex flex-wrap gap-2">
                {wf.chat.starters.map((s, i) => (
                  <button key={i} onClick={() => void send(pick(s))} disabled={noCredits} className="group inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-left text-[13.5px] font-medium text-jade-12 hairline transition hover:bg-jade-2 hover:shadow-[var(--shadow-card)] disabled:opacity-50">
                    <Icon name="sparkle" size={14} className="text-amber-9" /> {pick(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((m, i) => (
            <TurnView key={i} turn={m} urlFor={urlFor(m.runId)} />
          ))}
          {pending && <TurnView turn={pending} urlFor={urlFor(pending.runId)} streaming />}
          {error && <Alert tone="error">{error}</Alert>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-sand-4 bg-white p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
            rows={2}
            placeholder={t('chat_placeholder')}
            disabled={busy || noCredits}
            aria-label={t('chat_placeholder')}
          />
          <Button type="submit" loading={busy} disabled={!draft.trim() || noCredits} aria-label={t('send')} className="h-[52px] w-[52px] !px-0"><Icon name="send" size={18} /></Button>
        </form>
      </div>
    </div>
  );
}

function TurnView({ turn, urlFor, streaming }: { turn: Turn; urlFor: (a: Artifact, download?: boolean) => string; streaming?: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  if (turn.role === 'user') return <Bubble role="user"><p className="whitespace-pre-wrap text-[14.5px]">{turn.content}</p></Bubble>;
  const trace = turn.trace ?? [];
  return (
    <div className="space-y-3">
      <Bubble role="assistant">
        {trace.length > 0 && (
          <button type="button" onClick={() => setOpen(!open)} className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-jade-2 px-2.5 py-1 text-[11.5px] font-semibold text-jade-11 hairline transition hover:bg-jade-3">
            {streaming && trace.some((c) => c.output === undefined) ? <Icon name="loader" size={12} /> : <Icon name="bolt" size={12} />}
            {t('chat_tools_used', { n: trace.length })}
            <Icon name="chevronDown" size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        {turn.content ? <div className={streaming ? 'caret' : ''}><Markdown text={turn.content} /></div> : streaming ? <p className="text-[13.5px] text-sand-9">{t('chat_working')}</p> : null}
      </Bubble>
      {open && <div className="pl-11"><AgentTimeline trace={trace} running={!!streaming} /></div>}
      {!streaming && turn.runId && (turn.artifacts?.length ?? 0) > 0 && <div className="pl-11"><ArtifactsPanel artifacts={turn.artifacts!} urlFor={urlFor} /></div>}
      {!streaming && (turn.actions?.length ?? 0) > 0 && <div className="pl-11"><ActionsPanel actions={turn.actions!} /></div>}
    </div>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''} animate-rise`}>
      {!isUser && <Mark size={32} className="mt-1 shrink-0" />}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14.5px] ${isUser ? 'rounded-br-md bg-jade-12 text-white shadow-[0_8px_20px_-12px_rgb(11_47_39/.8)]' : 'rounded-bl-md bg-white text-sand-12 hairline shadow-[var(--shadow-card)]'}`}>{children}</div>
    </div>
  );
}
