import { ArrowLeft, RotateCcw, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ChatMessage, RunEvent } from '@shared/types';
import { Icon } from '@/components/Icon';
import { Alert, Button, Card, Textarea } from '@/components/ui';
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
    <div className="flex h-[calc(100vh-11rem)] min-h-[480px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/s/${token}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> {t('back')}</Link>
        <Button size="sm" variant="ghost" onClick={() => { setMessages([]); setPending(''); setError(null); }} disabled={busy || messages.length === 0}><RotateCcw className="h-3.5 w-3.5" /> {t('chat_reset')}</Button>
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name={wf.icon} className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{pick(wf.name)}</h1>
            <p className="truncate text-xs text-ink-500">{pick(wf.tagline)} · {t('chat_hint')}</p>
          </div>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          <Bubble role="assistant"><p>{pick(wf.chat.greeting)}</p></Bubble>
          {messages.length === 0 && (
            <div className="pl-11">
              <p className="mb-2 text-xs font-medium text-ink-500">{t('chat_starters')}</p>
              <div className="flex flex-wrap gap-2">
                {wf.chat.starters.map((s, i) => (
                  <button key={i} onClick={() => void send(pick(s))} disabled={noCredits} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-sm text-brand-900 hover:bg-brand-100 disabled:opacity-50">{pick(s)}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>{m.role === 'assistant' ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}</Bubble>
          ))}
          {busy && <Bubble role="assistant"><div className="cursor-blink"><Markdown text={pending} /></div></Bubble>}
          {error && <Alert tone="error">{error}</Alert>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-ink-100 p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
            rows={2}
            placeholder={t('chat_placeholder')}
            disabled={busy || noCredits}
            aria-label={t('chat_placeholder')}
          />
          <Button type="submit" loading={busy} disabled={!draft.trim() || noCredits} aria-label={t('send')}><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </div>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''} animate-rise`}>
      {!isUser && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">AI</span>}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-900'}`}>{children}</div>
    </div>
  );
}
