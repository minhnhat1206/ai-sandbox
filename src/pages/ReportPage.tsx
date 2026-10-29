import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { Lang, PublicReport } from '@shared/types';
import { ReportView } from '@/components/ReportView';
import { Alert, Button, Field, Input, Skeleton, Textarea } from '@/components/ui';
import { Icon } from '@/icons';
import { DICT, type DictKey } from '@/i18n/dict';
import { ApiError, reportApi } from '@/lib/api';

const tr = (lang: Lang, key: DictKey) => DICT[key][lang];

/** Public page the founder sends to the decision maker: /r/:token. No account, no sandbox link needed. */
export default function ReportPage() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [missing, setMissing] = useState(false);
  const preview = new URLSearchParams(location.search).has('preview');

  useEffect(() => {
    reportApi.get(token, preview).then((r) => {
      setReport(r.report);
      document.title = r.report.title;
      document.documentElement.lang = r.report.lang;
    }).catch(() => setMissing(true));
  }, [token, preview]);

  if (missing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand-1 px-5">
        <div className="max-w-sm text-center">
          <Icon name="FileSearch" size={36} className="mx-auto text-sand-8" />
          <h1 className="display mt-3 text-[22px] font-bold text-jade-12">{tr('vi', 'rp_missing')}</h1>
          <p className="mt-1 text-[14px] text-sand-10">{tr('en', 'rp_missing')}</p>
        </div>
      </main>
    );
  }
  if (!report) return <main className="mx-auto max-w-4xl space-y-4 px-4 py-10"><Skeleton className="h-56" /><Skeleton className="h-28" /><Skeleton className="h-72" /></main>;

  return (
    <main className="min-h-screen bg-sand-1 px-4 py-6 md:py-10 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end print:hidden">
        <Button variant="secondary" size="sm" icon="FileText" onClick={() => window.print()}>{tr(report.lang, 'rp_print')}</Button>
      </div>
      <ReportView report={report} company={report.company} cta={<AcceptForm token={token} lang={report.lang} accepted={!!report.acceptedAt} />} />
      <p className="mx-auto mt-6 max-w-4xl px-1 text-center text-[12px] text-sand-9">{tr(report.lang, 'rp_footer')}</p>
    </main>
  );
}

function AcceptForm({ token, lang, accepted }: { token: string; lang: Lang; accepted: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(accepted);
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await reportApi.accept(token, f);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'missing_contact' ? tr(lang, 'rp_accept_missing') : err instanceof ApiError && err.status === 429 ? tr(lang, 'rp_accept_wait') : tr(lang, 'rp_accept_error'));
    } finally {
      setBusy(false);
    }
  };
  if (done) return <Alert tone="success" icon="calendarCheck">{tr(lang, 'rp_accept_done')}</Alert>;
  if (!open) {
    return (
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14.5px] font-semibold text-jade-12">{tr(lang, 'rp_cta_q')}</p>
        <Button size="lg" icon="calendarCheck" onClick={() => setOpen(true)}>{tr(lang, 'rp_cta')}</Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4 animate-fade" aria-label={tr(lang, 'rp_cta')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(lang, 'rp_accept_name')} htmlFor="ra-n" required><Input id="ra-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
        <Field label={tr(lang, 'rp_accept_contact')} htmlFor="ra-e" required><Input id="ra-e" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
      </div>
      <Field label={tr(lang, 'rp_accept_msg')} htmlFor="ra-m"><Textarea id="ra-m" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={tr(lang, 'rp_accept_msg_ph')} /></Field>
      {error && <div role="alert"><Alert tone="error">{error}</Alert></div>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} icon="send">{tr(lang, 'rp_accept_send')}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tr(lang, 'rp_cancel')}</Button>
      </div>
    </form>
  );
}
