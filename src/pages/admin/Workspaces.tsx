import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Lang, WorkflowDef } from '@shared/types';
import { Alert, Badge, Button, Card, Field, Input, Modal, Select, Spinner, Textarea } from '@/components/ui';
import { useLang } from '@/i18n';
import { adminApi, type WorkspaceWithStats } from '@/lib/api';

const STATUS_TONE = { draft: 'neutral', active: 'success', converted: 'brand', archived: 'warn' } as const;

export default function Workspaces() {
  const { t, pick, lang } = useLang();
  const nav = useNavigate();
  const [list, setList] = useState<WorkspaceWithStats[] | null>(null);
  const [catalog, setCatalog] = useState<WorkflowDef[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ company: '', industry: '', contactName: '', contactEmail: '', language: 'vi' as Lang, brief: '', credits: 50, workflowIds: ['company-assistant', 'customer-reply', 'weekly-report', 'meeting-actions'] });

  useEffect(() => {
    adminApi.workspaces().then((r) => setList(r.workspaces)).catch((e) => setError(String(e)));
    adminApi.catalog().then((r) => setCatalog(r.workflows)).catch(() => undefined);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { workspace } = await adminApi.createWorkspace(form);
      nav(`/admin/workspaces/${workspace.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id: string) => setForm((f) => ({ ...f, workflowIds: f.workflowIds.includes(id) ? f.workflowIds.filter((x) => x !== id) : [...f.workflowIds, id] }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('ad_nav_workspaces')}</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('ad_new_ws')}</Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {!list ? <Spinner label={t('loading')} /> : (
        <Card className="divide-y divide-ink-100">
          {list.map((w) => (
            <Link key={w.id} to={`/admin/workspaces/${w.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-ink-50">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{w.company} <span className="text-xs text-ink-500">/s/{w.token}</span></p>
                <p className="text-xs text-ink-500">{w.industry || '—'} · {w.workflowIds.length + w.customWorkflows.length} {t('sb_nav_workflows').toLowerCase()} · {w.credits.used}/{w.credits.total} credits · {new Date(w.updatedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
              </div>
              <span className="text-xs text-ink-700">{w.stats.runs} {t('ad_kpi_runs').toLowerCase()} · {w.stats.leads} {t('ad_kpi_leads').toLowerCase()}</span>
              <Badge tone={STATUS_TONE[w.status]}>{w.status}</Badge>
            </Link>
          ))}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('ad_new_ws')} wide>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('ad_ws_company')} required htmlFor="c"><Input id="c" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label={t('ad_ws_industry')} htmlFor="i"><Input id="i" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="FMCG distribution, 180 staff" /></Field>
            <Field label={t('ad_ws_contact')} htmlFor="cn"><Input id="cn" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label={t('ad_ws_email')} htmlFor="ce"><Input id="ce" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field>
            <Field label={t('ad_ws_lang')} htmlFor="l"><Select id="l" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Lang })}><option value="vi">{t('lang_vi')}</option><option value="en">{t('lang_en')}</option></Select></Field>
            <Field label={t('ad_ws_credits')} htmlFor="cr"><Input id="cr" type="number" min={1} max={10000} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /></Field>
          </div>
          <Field label={t('ad_ws_brief')} htmlFor="b"><Textarea id="b" rows={4} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} /></Field>
          <div>
            <p className="mb-2 text-sm font-medium">{t('ad_ws_workflows')}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {catalog.map((w) => (
                <label key={w.id} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm hover:bg-ink-50">
                  <input type="checkbox" checked={form.workflowIds.includes(w.id)} onChange={() => toggle(w.id)} /> {pick(w.name)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button><Button type="submit" loading={busy}>{t('save')}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
