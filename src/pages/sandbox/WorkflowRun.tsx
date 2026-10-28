import { ArrowLeft, Check, Copy, Play, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sampleInputs, validateInputs } from '@shared/engine/template';
import type { L, Run, RunEvent } from '@shared/types';
import { Icon } from '@/components/Icon';
import { Alert, Badge, Button, Card, Field, Input, Select, Stars, Textarea } from '@/components/ui';
import { useLang } from '@/i18n';
import { ApiError, sandboxApi, streamRun } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

interface StepState { id: string; title: L; text: string; done: boolean }

export default function WorkflowRun() {
  const { id = '' } = useParams();
  const { t, lang, pick } = useLang();
  const { token, view, setCredits } = useSandbox();
  const wf = useMemo(() => view.workflows.find((w) => w.id === id), [view.workflows, id]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<StepState[]>([]);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number | undefined>();
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (running && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [steps, running]);

  if (!wf || wf.kind !== 'form') {
    return <Alert tone="error">{t('sb_not_found')}</Alert>;
  }

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
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const rate = async (n: 1 | 2 | 3 | 4 | 5) => {
    setRating(n);
    if (run) await sandboxApi.feedback(token, run.id, n, feedback).catch(() => undefined);
  };
  const sendFeedback = async () => {
    if (run && rating) {
      await sandboxApi.feedback(token, run.id, rating, feedback).catch(() => undefined);
      setFeedbackSent(true);
    }
  };

  const noCredits = view.creditsRemaining <= 0;
  const hasOutput = steps.length > 0;

  return (
    <div className="space-y-5">
      <Link to={`/s/${token}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> {t('back')}</Link>
      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name={wf.icon} className="h-6 w-6" /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{pick(wf.name)}</h1>
          <p className="text-ink-700">{pick(wf.description)}</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('run_inputs')}</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={fill} disabled={running}><Wand2 className="h-3.5 w-3.5" /> {t('run_use_sample')}</Button>
              <Button size="sm" variant="ghost" onClick={clear} disabled={running}>{t('run_clear')}</Button>
            </div>
          </div>
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
          <Button size="lg" className="w-full" onClick={go} loading={running} disabled={noCredits}>
            {running ? t('run_running') : hasOutput ? <><RotateCcw className="h-4 w-4" /> {t('run_again')}</> : <><Play className="h-4 w-4" /> {t('run_go')}</>}
          </Button>
          {noCredits && <p className="text-xs text-amber-700">{t('sb_credits_out')}</p>}
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t('run_result')}</h2>
            {hasOutput && (
              <Button size="sm" variant="secondary" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5" /> {t('copied')}</> : <><Copy className="h-3.5 w-3.5" /> {t('copy')}</>}</Button>
            )}
          </div>
          {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
          {!hasOutput && !error && (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 p-10 text-center text-sm text-ink-500">
              <Sparkles className="mb-2 h-6 w-6 text-brand-400" />
              {t('run_result_empty')}
            </div>
          )}
          <div ref={outputRef} className="mt-3 max-h-[70vh] overflow-y-auto space-y-5 pr-1">
            {steps.map((s, i) => (
              <section key={s.id} className="animate-rise">
                {steps.length > 1 && (
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${s.done ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-700'}`}>{s.done ? '✓' : i + 1}</span>
                    {t('run_step')} {i + 1}: {pick(s.title)}
                  </div>
                )}
                <div className={!s.done && running ? 'cursor-blink' : ''}>
                  <Markdown text={s.text} />
                </div>
              </section>
            ))}
          </div>

          {run && (
            <div className="mt-5 space-y-4 border-t border-ink-100 pt-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <Badge tone="success">{t('run_time_saved', { n: run.minutesSaved })}</Badge>
                <span>· {run.inputTokens + run.outputTokens} {t('run_tokens')}</span>
                {run.finishedAt && <span>· {((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)}{t('run_duration')}</span>}
                {run.provider === 'mock' && <Badge tone="warn">{t('demo_mode')}</Badge>}
              </div>
              <div className="rounded-xl bg-ink-50 p-4">
                <p className="text-sm font-medium">{t('run_rate')}</p>
                <div className="mt-1"><Stars value={rating} onChange={rate} /></div>
                {rating && !feedbackSent && (
                  <div className="mt-2 flex gap-2">
                    <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('run_feedback_placeholder')} />
                    <Button size="sm" variant="secondary" onClick={sendFeedback}>{t('send')}</Button>
                  </div>
                )}
                {feedbackSent && <p className="mt-2 text-xs text-emerald-700">{t('run_rate_thanks')}</p>}
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-brand-900">{t('run_cta_title')}</p>
                  <p className="text-sm text-brand-800">{t('run_cta_sub')}</p>
                </div>
                <Link to={`/s/${token}/contact?type=book_call&wf=${wf.id}`}><Button>{t('run_cta_btn')}</Button></Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
