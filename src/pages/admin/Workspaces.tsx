import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Lang, WorkflowDef } from '@shared/types';
import { Alert, Badge, Button, Field, Input, Modal, SectionHead, Select, Skeleton, Textarea } from '@/components/ui';
import { Icon } from '@/icons';
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
    <div className="space-y-6">
      <SectionHead title={t('ad_nav_workspaces')} right={<Button onClick={() => setOpen(true)} icon="plus">{t('ad_new_ws')}</Button>} />
      {error && <Alert tone="error">{error}</Alert>}
      {!list ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div> : (
        <div className="overflow-hidden rounded-xl2 bg-white hairline shadow-[var(--shadow-card)]">
          {list.map((w, i) => (
            <Link key={w.id} to={`/admin/workspaces/${w.id}`} className={`group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-jade-1 ${i > 0 ? 'border-t border-sand-4' : ''}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-jade-3 text-[14px] font-bold text-jade-11">{w.company.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-jade-12">{w.company} <span className="font-mono text-[11px] font-medium text-sand-9">/s/{w.token}</span></p>
                <p className="text-[12.5px] text-sand-9">{w.industry || '—'} · {w.workflowIds.length + w.customWorkflows.length} {t('sb_nav_workflows').toLowerCase()} · <span className="tnum">{w.credits.used}/{w.credits.total}</span> credits · {new Date(w.updatedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
              </div>
              <span className="hidden text-[12.5px] text-sand-10 tnum sm:block"><Icon name="bolt" size={13} className="mr-1 inline text-jade-9" />{w.stats.runs} · <Icon name="inbox" size={13} className="mx-1 inline text-jade-9" />{w.stats.leads}</span>
              <Badge tone={STATUS_TONE[w.status]} dot>{w.status}</Badge>
              <Icon name="chevronRight" size={16} className="text-sand-7 transition group-hover:translate-x-0.5 group-hover:text-jade-9" />
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('ad_new_ws')} wide eyebrow={t('ad_nav_workspaces')}>
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
            <p className="mb-2 text-[13px] font-semibold">{t('ad_ws_workflows')}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {catalog.map((w) => {
                const on = form.workflowIds.includes(w.id);
                return (
                  <label key={w.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition ${on ? 'bg-jade-2 text-jade-12 ring-1 ring-jade-5' : 'bg-sand-2 text-sand-11 hover:bg-sand-3'}`}>
                    <input type="checkbox" className="accent-jade-9" checked={on} onChange={() => toggle(w.id)} /> <Icon name={w.icon} size={16} className="text-jade-9" /> {pick(w.name)}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button><Button type="submit" loading={busy} icon="check">{t('save')}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
