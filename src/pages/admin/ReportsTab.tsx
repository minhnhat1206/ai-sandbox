import { useEffect, useState } from 'react';
import type { Lang, Report, Workspace } from '@shared/types';
import { ReportView } from '@/components/ReportView';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { ApiError, adminApi } from '@/lib/api';

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Build, edit, preview and publish the report sent to the decision maker after the trial. */
export function ReportsTab({ ws }: { ws: Workspace }) {
  const { t } = useLang();
  const toast = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [current, setCurrent] = useState<Report | null>(null);
  const [lang, setLang] = useState<Lang>(ws.language);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.reports(ws.id).then((r) => { setReports(r.reports); setCurrent(r.reports[0] ?? null); }).catch((e) => setError(String(e)));
  }, [ws.id]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { report } = await adminApi.createReport(ws.id, lang);
      setReports((list) => [report, ...(list ?? [])]);
      setCurrent(report);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'no_runs' ? t('ad_rp_no_runs') : e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const save = async (patch: Record<string, unknown>, message = t('saved')) => {
    if (!current) return;
    setBusy(true);
    try {
      const { report } = await adminApi.updateReport(current.id, patch);
      setCurrent(report);
      setReports((list) => (list ?? []).map((r) => (r.id === report.id ? report : r)));
      toast.show(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!current) return;
    await adminApi.deleteReport(current.id);
    const rest = (reports ?? []).filter((r) => r.id !== current.id);
    setReports(rest);
    setCurrent(rest[0] ?? null);
  };

  if (!reports) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <Alert tone="info" icon="Lightbulb">{t('ad_rp_hint')}</Alert>
      {error && <Alert tone="error">{error}</Alert>}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label={t('ad_rp_lang')} htmlFor="rp-lang">
          <Select id="rp-lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="vi">{t('lang_vi')}</option><option value="en">{t('lang_en')}</option></Select>
        </Field>
        <Button onClick={create} loading={busy} icon="Sparkles">{reports.length ? t('ad_rp_create_again') : t('ad_rp_create')}</Button>
        {reports.length > 1 && (
          <Field label={t('ad_rp_versions')} htmlFor="rp-ver">
            <Select id="rp-ver" value={current?.id ?? ''} onChange={(e) => setCurrent(reports.find((r) => r.id === e.target.value) ?? null)}>
              {reports.map((r) => <option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.status}</option>)}
            </Select>
          </Field>
        )}
      </Card>
      {!current ? (
        <EmptyState title={t('ad_rp_empty')}>{t('ad_rp_empty_sub')}</EmptyState>
      ) : (
        <ReportEditor key={current.id} report={current} company={ws.company} busy={busy} onSave={save} onDelete={remove} />
      )}
    </div>
  );
}

function ReportEditor({ report, company, busy, onSave, onDelete }: { report: Report; company: string; busy: boolean; onSave: (p: Record<string, unknown>, msg?: string) => Promise<void>; onDelete: () => Promise<void> }) {
  const { t } = useLang();
  const toast = useToast();
  const [f, setF] = useState({
    title: report.title, preparedFor: report.preparedFor, summary: report.summary, findings: report.findings.join('\n'), nextSteps: report.nextSteps,
    offerTitle: report.offer.title, price: report.offer.price, duration: report.offer.duration, audience: report.offer.audience, agenda: report.offer.agenda.join('\n'), includes: report.offer.includes.join('\n'),
  });
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((s) => ({ ...s, [k]: v }));
  const patch = () => ({
    title: f.title, preparedFor: f.preparedFor, summary: f.summary, findings: lines(f.findings), nextSteps: f.nextSteps,
    offer: { title: f.offerTitle, price: f.price, duration: f.duration, audience: f.audience, agenda: lines(f.agenda), includes: lines(f.includes) },
  });
  const draft: Report = { ...report, ...patch(), offer: patch().offer };
  const url = `${location.origin}/r/${report.token}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.show(t('copied'), 'copy'); } catch { /* ignore */ } };
  const published = report.status === 'published';

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Badge tone={published ? 'success' : 'neutral'} dot>{published ? t('ad_rp_published') : t('ad_rp_draft')}</Badge>
          {published && <span className="text-sand-10 tnum"><Icon name="search" size={13} className="inline" /> {t('ad_rp_views', { n: report.views })}{report.lastViewedAt ? ` · ${new Date(report.lastViewedAt).toLocaleString()}` : ''}</span>}
          {report.acceptedAt && <Badge tone="brand" dot>{t('ad_rp_accepted')}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={preview ? 'PenLine' : 'FileSearch'} onClick={() => setPreview(!preview)}>{preview ? t('ad_rp_edit') : t('ad_rp_preview')}</Button>
          <Button size="sm" variant="soft" icon="check" loading={busy} onClick={() => onSave(patch())}>{t('save')}</Button>
          {published
            ? <Button size="sm" variant="ghost" icon="lock" onClick={() => onSave({ ...patch(), status: 'draft' }, t('ad_rp_unpublished'))}>{t('ad_rp_unpublish')}</Button>
            : <Button size="sm" icon="send" loading={busy} onClick={() => onSave({ ...patch(), status: 'published' }, t('ad_rp_published_toast'))}>{t('ad_rp_publish')}</Button>}
        </div>
      </Card>

      {published && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white py-1.5 pl-3.5 pr-1.5 text-[13px] hairline shadow-[var(--shadow-card)]">
          <Icon name="paperclip" size={15} className="text-jade-9" />
          <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-jade-11">{url}</code>
          <Button size="sm" variant="soft" onClick={copy} icon="copy">{t('ad_copy_link')}</Button>
          <a href={`${url}?preview`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="external">{t('ad_rp_open')}</Button></a>
        </div>
      )}

      {preview ? (
        <div className="rounded-xl3 bg-sand-2 p-3 md:p-6 animate-fade"><ReportView report={draft} company={company} /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold text-jade-12">{t('ad_rp_content')}</h3>
            <Field label={t('ad_rp_title')} htmlFor="rp-t"><Input id="rp-t" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label={t('ad_rp_for')} htmlFor="rp-f"><Input id="rp-f" value={f.preparedFor} onChange={(e) => set('preparedFor', e.target.value)} /></Field>
            <Field label={t('ad_rp_summary')} htmlFor="rp-s" help={t('ad_rp_summary_help')}><Textarea id="rp-s" rows={7} value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
            <Field label={t('ad_rp_findings')} htmlFor="rp-fi" help={t('ad_rp_lines_help')}><Textarea id="rp-fi" rows={8} value={f.findings} onChange={(e) => set('findings', e.target.value)} /></Field>
            <Field label={t('ad_rp_next')} htmlFor="rp-n"><Textarea id="rp-n" rows={4} value={f.nextSteps} onChange={(e) => set('nextSteps', e.target.value)} /></Field>
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold text-jade-12">{t('ad_rp_offer')}</h3>
            <Field label={t('ad_rp_offer_title')} htmlFor="rp-ot"><Input id="rp-ot" value={f.offerTitle} onChange={(e) => set('offerTitle', e.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ad_rp_price')} htmlFor="rp-p"><Input id="rp-p" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
              <Field label={t('ad_rp_duration')} htmlFor="rp-d"><Input id="rp-d" value={f.duration} onChange={(e) => set('duration', e.target.value)} /></Field>
            </div>
            <Field label={t('ad_rp_audience')} htmlFor="rp-a"><Input id="rp-a" value={f.audience} onChange={(e) => set('audience', e.target.value)} /></Field>
            <Field label={t('ad_rp_agenda')} htmlFor="rp-ag" help={t('ad_rp_lines_help')}><Textarea id="rp-ag" rows={6} value={f.agenda} onChange={(e) => set('agenda', e.target.value)} /></Field>
            <Field label={t('ad_rp_includes')} htmlFor="rp-in" help={t('ad_rp_lines_help')}><Textarea id="rp-in" rows={5} value={f.includes} onChange={(e) => set('includes', e.target.value)} /></Field>
            <div className="rounded-xl bg-sand-2 p-3 text-[12.5px] text-sand-10">
              <p className="font-semibold text-sand-11">{t('ad_rp_figures')}</p>
              <p className="mt-1 tnum">{t('ad_rp_figures_line', { runs: report.metrics.runs, wf: report.metrics.workflowsTried, h: Math.round(report.metrics.minutesSaved / 6) / 10, p: report.metrics.people })}</p>
            </div>
            <div className="flex justify-end border-t border-sand-4 pt-3"><Button size="sm" variant="ghost" className="text-coral-11" icon="trash" onClick={onDelete}>{t('delete')}</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
