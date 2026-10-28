import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ChatMessage, RunEvent } from '@shared/types';
import { Mark } from '@/components/Logo';
import { Alert, Button, IconTile, Textarea } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { ApiError, streamRun } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

export default function ChatAgent() {
  const { id = '' } = useParams();
  const { t, lang, pick } = useLang();
  const { token, view, setCredits } = useSandbox();
  const wf = useMemo(() => view.workflows.find((w) => w.id === id), [view.workflows, id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending]);

  if (!wf || wf.kind !== 'chat' || !wf.chat) return <Alert tone="error">{t('sb_not_found')}</Alert>;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setPending('');
    setError(null);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    let acc = '';
    try {
      await streamRun(token, 'chat', { workflowId: wf.id, lang, messages: next }, (e: RunEvent) => {
        if (e.type === 'run.started') setCredits(e.creditsRemaining);
        if (e.type === 'step.delta') { acc += e.text; setPending(acc); }
        if (e.type === 'run.done') { setCredits(e.creditsRemaining); setMessages((m) => [...m, { role: 'assistant', content: e.run.output }]); setPending(''); }
        if (e.type === 'error') setError(e.code === 'no_credits' ? t('run_error_credits') : e.message);
      }, ac.signal);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_credits') setError(t('run_error_credits'));
      else if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(draft); };
  const noCredits = view.creditsRemaining <= 0;

  return (
    <div className="flex h-[calc(100dvh-15.5rem)] min-h-[520px] flex-col gap-3 md:h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/s/${token}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-sand-9 transition hover:text-jade-11"><Icon name="arrowLeft" size={15} /> {t('back')}</Link>
        <Button size="sm" variant="ghost" icon="rotate" onClick={() => { setMessages([]); setPending(''); setError(null); }} disabled={busy || messages.length === 0}>{t('chat_reset')}</Button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl3 bg-white hairline shadow-[var(--shadow-card)] animate-rise">
        <header className="flex items-center gap-3 border-b border-sand-4 bg-sand-1/70 px-5 py-3.5">
          <IconTile name={wf.icon} size="sm" />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-jade-12">{pick(wf.name)}</h1>
            <p className="truncate text-[12px] text-sand-9">{pick(wf.tagline)} · {t('chat_hint')}</p>
          </div>
          {view.knowledgeTitles.length > 0 && wf.useKnowledge && (
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-jade-3 px-2.5 py-1 text-[11.5px] font-semibold text-jade-11 sm:inline-flex"><Icon name="book" size={13} /> {view.knowledgeTitles.length} {t('sb_uses_docs').toLowerCase()}</span>
          )}
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 dotfield" aria-live="polite">
          <Bubble role="assistant"><p className="text-[14.5px]">{pick(wf.chat.greeting)}</p></Bubble>
          {messages.length === 0 && (
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
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>{m.role === 'assistant' ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap text-[14.5px]">{m.content}</p>}</Bubble>
          ))}
          {busy && <Bubble role="assistant"><div className="caret"><Markdown text={pending} /></div></Bubble>}
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

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''} animate-rise`}>
      {!isUser && <Mark size={32} className="mt-1 shrink-0" />}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14.5px] ${isUser ? 'rounded-br-md bg-jade-12 text-white shadow-[0_8px_20px_-12px_rgb(11_47_39/.8)]' : 'rounded-bl-md bg-white text-sand-12 hairline shadow-[var(--shadow-card)]'}`}>{children}</div>
    </div>
  );
}
