import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sampleInputs, validateInputs } from '@shared/engine/template';
import type { L, Run, RunEvent } from '@shared/types';
import { WaitingArt } from '@/components/illustrations';
import { Alert, Badge, Button, Field, IconTile, Input, Select, Stars, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { ApiError, sandboxApi, streamRun } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

interface StepState { id: string; title: L; text: string; done: boolean }

export default function WorkflowRun() {
  const { id = '' } = useParams();
  const { t, lang, pick } = useLang();
  const { token, view, setCredits } = useSandbox();
  const toast = useToast();
  const wf = useMemo(() => view.workflows.find((w) => w.id === id), [view.workflows, id]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<StepState[]>([]);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | undefined>();
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (running && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [steps, running]);

  if (!wf || wf.kind !== 'form') return <Alert tone="error">{t('sb_not_found')}</Alert>;

  const fill = () => { setInputs(sampleInputs(wf)); setErrors({}); };
  const clear = () => { setInputs({}); setErrors({}); };

  const go = async () => {
    const errs = validateInputs(wf.inputs, inputs);
    if (errs.length) {
      setErrors(Object.fromEntries(errs.map((e) => [e.key, e.message[lang]])));
      return;
    }
    setErrors({});
    setError(null);
    setRun(null);
    setRating(undefined);
    setFeedback('');
    setFeedbackSent(false);
    setSteps([]);
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamRun(token, 'runs', { workflowId: wf.id, lang, inputs }, (e: RunEvent) => {
        switch (e.type) {
          case 'run.started': setCredits(e.creditsRemaining); break;
          case 'step.started': setSteps((s) => [...s, { id: e.stepId, title: e.title, text: '', done: false }]); break;
          case 'step.delta': setSteps((s) => s.map((st) => (st.id === e.stepId ? { ...st, text: st.text + e.text } : st))); break;
          case 'step.done': setSteps((s) => s.map((st) => (st.id === e.stepId ? { ...st, done: true } : st))); break;
          case 'run.done': setRun(e.run); setCredits(e.creditsRemaining); break;
          case 'error': setError(e.code === 'no_credits' ? t('run_error_credits') : e.message); break;
        }
      }, ac.signal);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_credits') setError(t('run_error_credits'));
      else if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    const text = run?.output ?? steps.map((s) => s.text).join('\n\n');
    try { await navigator.clipboard.writeText(text); toast.show(t('copied'), 'copy'); } catch { /* ignore */ }
  };
  const rate = async (n: 1 | 2 | 3 | 4 | 5) => {
    setRating(n);
    if (run) await sandboxApi.feedback(token, run.id, n, feedback).catch(() => undefined);
  };
  const sendFeedback = async () => {
    if (run && rating) {
      await sandboxApi.feedback(token, run.id, rating, feedback).catch(() => undefined);
      setFeedbackSent(true);
      toast.show(t('run_rate_thanks'), 'thumbsUp');
    }
  };

  const noCredits = view.creditsRemaining <= 0;
  const hasOutput = steps.length > 0;
  const duration = run?.finishedAt ? ((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1) : null;

  return (
    <div className="space-y-5">
      <Link to={`/s/${token}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-sand-9 transition hover:text-jade-11"><Icon name="arrowLeft" size={15} /> {t('back')}</Link>
      <header className="flex items-start gap-4 animate-rise">
        <IconTile name={wf.icon} size="lg" />
        <div className="min-w-0">
          <p className="eyebrow">{t('sb_saves', { n: wf.minutesSavedPerRun })}</p>
          <h1 className="display mt-1 text-[26px] font-bold text-jade-12 md:text-[32px]">{pick(wf.name)}</h1>
          <p className="mt-1.5 text-[14.5px] text-sand-10">{pick(wf.description)}</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ---------------------------------------------------- inputs */}
        <section className="rounded-xl2 bg-white p-5 hairline shadow-[var(--shadow-card)] lg:col-span-2 animate-rise delay-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="PenLine" size={17} className="text-jade-9" /> {t('run_inputs')}</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="soft" onClick={fill} disabled={running} icon="sparkle">{t('run_use_sample')}</Button>
              <Button size="sm" variant="ghost" onClick={clear} disabled={running}>{t('run_clear')}</Button>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {wf.inputs.map((f) => {
              const common = { id: `f-${f.key}`, value: inputs[f.key] ?? '', disabled: running };
              const set = (v: string) => setInputs((s) => ({ ...s, [f.key]: v }));
              return (
                <Field key={f.key} htmlFor={common.id} label={pick(f.label)} required={f.required} help={f.help ? pick(f.help) : undefined} error={errors[f.key]}>
                  {f.type === 'textarea' ? (
                    <Textarea {...common} rows={f.rows ?? 5} placeholder={f.placeholder ? pick(f.placeholder) : undefined} onChange={(e) => set(e.target.value)} />
                  ) : f.type === 'select' ? (
                    <Select {...common} onChange={(e) => set(e.target.value)}>
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{pick(o.label)}</option>)}
                    </Select>
                  ) : (
                    <Input {...common} type={f.type === 'number' ? 'number' : 'text'} placeholder={f.placeholder ? pick(f.placeholder) : undefined} onChange={(e) => set(e.target.value)} />
                  )}
                </Field>
              );
            })}
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={go} loading={running} disabled={noCredits} icon={running ? undefined : hasOutput ? 'rotate' : 'play'}>
            {running ? t('run_running') : hasOutput ? t('run_again') : t('run_go')}
          </Button>
          {noCredits && <p className="mt-2 text-center text-xs text-amber-11">{t('sb_credits_out')}</p>}
        </section>

        {/* ---------------------------------------------------- result */}
        <section className="paper flex flex-col rounded-xl2 p-5 lg:col-span-3 animate-rise delay-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="FileText" size={17} className="text-jade-9" /> {t('run_result')}</h2>
            {hasOutput && <Button size="sm" variant="secondary" onClick={copy} icon="copy">{t('copy')}</Button>}
          </div>
          {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
          {!hasOutput && !error && (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-sand-5 bg-sand-1/60 p-10 text-center">
              <WaitingArt className="mb-3 w-40 text-sand-8" />
              <p className="max-w-xs text-[13.5px] text-sand-9">{t('run_result_empty')}</p>
            </div>
          )}
          {hasOutput && (
            <div ref={outputRef} className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
              {steps.length > 1 && (
                <ol className="mb-4 flex items-center gap-2 text-[12px] font-semibold">
                  {steps.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 ${s.done ? 'bg-jade-3 text-jade-11' : 'bg-sand-3 text-sand-10'}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${s.done ? 'bg-jade-9 text-white' : 'bg-white text-sand-10'}`}>{s.done ? <Icon name="check" size={11} strokeWidth={2.5} /> : i + 1}</span>
                        {pick(s.title)}
                      </span>
                      {i < steps.length - 1 && <span className="h-px w-5 bg-sand-5" />}
                    </li>
                  ))}
                </ol>
              )}
              <div className="space-y-6">
                {steps.map((s, i) => (
                  <section key={s.id} className="animate-fade">
                    {steps.length > 1 && <p className="eyebrow mb-2">{t('run_step')} {i + 1} · {pick(s.title)}</p>}
                    <div className={!s.done && running ? 'caret' : ''}>
                      <Markdown text={s.text} />
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {run && (
            <div className="mt-5 space-y-4 border-t border-sand-4 pt-4 animate-rise">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-sand-9">
                <Badge tone="success" dot>{t('run_time_saved', { n: run.minutesSaved })}</Badge>
                <span className="tnum">· {run.inputTokens + run.outputTokens} {t('run_tokens')}</span>
                {duration && <span className="tnum">· {duration}{t('run_duration')}</span>}
                {run.provider === 'mock' && <Badge tone="warn">{t('demo_mode')}</Badge>}
              </div>
              <div className="rounded-xl bg-sand-2 p-4">
                <p className="text-[14px] font-semibold text-jade-12">{t('run_rate')}</p>
                <div className="mt-1.5"><Stars value={rating} onChange={rate} /></div>
                {rating && !feedbackSent && (
                  <div className="mt-3 flex gap-2 animate-rise">
                    <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('run_feedback_placeholder')} />
                    <Button size="md" variant="secondary" onClick={sendFeedback} icon="send">{t('send')}</Button>
                  </div>
                )}
                {feedbackSent && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-jade-11"><Icon name="checkCircle" size={14} /> {t('run_rate_thanks')}</p>}
              </div>
              <div className="grain relative overflow-hidden rounded-xl2 bg-ink-900 p-5 text-white">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-jade-8/40 blur-3xl" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-bold">{t('run_cta_title')}</p>
                    <p className="mt-0.5 text-[13.5px] text-white/70">{t('run_cta_sub')}</p>
                  </div>
                  <Link to={`/s/${token}/contact?type=book_call&wf=${wf.id}`}><Button icon="calendarCheck" className="shrink-0">{t('run_cta_btn')}</Button></Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
