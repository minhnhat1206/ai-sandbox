import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { validateWorkflow } from '@shared/engine/validate';
import { parseCsv } from '@shared/engine/csv';
import type { DataSource, KnowledgeDoc, Lang, Lead, McpServer, Run, WorkflowDef, WorkflowOverride, Workspace, WorkspaceStatus } from '@shared/types';
import { ActionsPanel, ArtifactsPanel } from '@/components/AgentPanel';
import { Alert, Badge, Button, Card, Field, IconTile, Input, Select, Skeleton, Stars, Tabs, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi } from '@/lib/api';
import { Markdown } from '@/lib/markdown';

type Tab = 'general' | 'workflows' | 'knowledge' | 'data' | 'connectors' | 'custom' | 'activity';
const STATUS_TONE = { draft: 'neutral', active: 'success', converted: 'brand', archived: 'warn' } as const;

export default function WorkspaceEditor() {
  const { id = '' } = useParams();
  const { t, pick, lang } = useLang();
  const toast = useToast();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [catalog, setCatalog] = useState<WorkflowDef[]>([]);
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.workspace(id).then((r) => setWs(r.workspace)).catch((e) => setError(String(e)));
    adminApi.catalog().then((r) => setCatalog(r.workflows)).catch(() => undefined);
  }, [id]);

  const save = useCallback(async (patch: Record<string, unknown>) => {
    if (!ws) return;
    setSaving(true);
    setError(null);
    try {
      const r = await adminApi.updateWorkspace(ws.id, patch);
      setWs(r.workspace);
      setSavedAt(Date.now());
      toast.show(t('saved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setSaving(false);
    }
  }, [ws, t, toast]);

  if (error && !ws) return <Alert tone="error">{error}</Alert>;
  if (!ws) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-12" /><Skeleton className="h-96" /></div>;

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'general', label: t('ad_tab_general'), icon: 'building' },
    { id: 'workflows', label: t('ad_tab_workflows'), icon: 'grid', count: ws.workflowIds.length },
    { id: 'knowledge', label: t('ad_tab_knowledge'), icon: 'book', count: ws.knowledge.length },
    { id: 'data', label: t('ad_tab_data'), icon: 'Table', count: ws.dataSources?.length ?? 0 },
    { id: 'connectors', label: t('ad_tab_connectors'), icon: 'Globe', count: ws.mcpServers?.length ?? 0 },
    { id: 'custom', label: t('ad_tab_custom'), icon: 'Wand2', count: ws.customWorkflows.length },
    { id: 'activity', label: t('ad_tab_activity'), icon: 'bolt' },
  ];

  return (
    <div className="space-y-5">
      <Link to="/admin/workspaces" className="inline-flex items-center gap-1 text-[13px] font-semibold text-sand-9 transition hover:text-jade-11"><Icon name="arrowLeft" size={15} /> {t('back')}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jade-12 text-[20px] font-bold text-white">{ws.company.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1 className="display text-[26px] font-bold text-jade-12 md:text-[30px]">{ws.company}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-sand-9">{ws.industry || '—'} <Badge tone={STATUS_TONE[ws.status]} dot>{ws.status}</Badge> <span className="tnum">{ws.credits.used}/{ws.credits.total} credits</span> <span className="tnum">· ${(ws.spentUsd ?? 0).toFixed(2)} / ${(ws.budgetUsd ?? 0).toFixed(0)}</span></p>
          </div>
        </div>
        <ShareBox token={ws.token} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <span className="text-[12px] text-sand-9">{saving ? t('loading') : savedAt ? <span className="inline-flex items-center gap-1 text-jade-11"><Icon name="checkCircle" size={13} /> {t('saved')}</span> : ''}</span>
      </div>

      <div className="animate-fade" key={tab}>
        {tab === 'general' && <GeneralTab ws={ws} onSave={save} saving={saving} />}
        {tab === 'workflows' && <WorkflowsTab ws={ws} catalog={catalog} onSave={save} />}
        {tab === 'knowledge' && <KnowledgeTab ws={ws} onSave={save} saving={saving} />}
        {tab === 'data' && <DataTab ws={ws} onSave={save} saving={saving} />}
        {tab === 'connectors' && <ConnectorsTab ws={ws} onSave={save} saving={saving} />}
        {tab === 'custom' && <CustomTab ws={ws} onSave={save} lang={lang} />}
        {tab === 'activity' && <ActivityTab ws={ws} pick={pick} />}
      </div>
    </div>
  );
}

export function BudgetMeter({ spent, budget, label, compact }: { spent: number; budget: number; label: string; compact?: boolean }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const tone = pct >= 100 ? 'bg-coral-9' : pct >= 80 ? 'bg-amber-9' : 'bg-jade-8';
  return (
    <div className={compact ? 'min-w-[140px]' : 'mt-3'}>
      <div className="flex items-center justify-between text-[11.5px] text-sand-10 tnum">
        <span>{label}: <strong className="text-sand-12">${spent.toFixed(2)}</strong> / ${budget.toFixed(0)}</span>
        <span className={pct >= 100 ? 'font-semibold text-coral-11' : ''}>{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-jade-3"><div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ShareBox({ token }: { token: string }) {
  const { t } = useLang();
  const toast = useToast();
  const url = `${location.origin}/s/${token}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.show(t('copied'), 'copy'); } catch { /* ignore */ } };
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white py-1.5 pl-3.5 pr-1.5 text-[13px] hairline shadow-[var(--shadow-card)]">
      <Icon name="paperclip" size={15} className="text-jade-9" />
      <code className="font-mono text-[12px] text-jade-11">{url}</code>
      <Button size="sm" variant="soft" onClick={copy} icon="copy">{t('ad_copy_link')}</Button>
      <a href={url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="external">{t('ad_open_link')}</Button></a>
    </div>
  );
}

function GeneralTab({ ws, onSave, saving }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const { t } = useLang();
  const [f, setF] = useState({ company: ws.company, industry: ws.industry, contactName: ws.contactName, contactEmail: ws.contactEmail, language: ws.language, brief: ws.brief, notes: ws.notes, token: ws.token, status: ws.status, total: ws.credits.total, used: ws.credits.used, budgetUsd: ws.budgetUsd ?? 10, expiresAt: ws.expiresAt ? ws.expiresAt.slice(0, 10) : '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => onSave({ ...f, credits: { total: f.total, used: f.used }, budgetUsd: f.budgetUsd, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null });
  const del = async () => {
    await adminApi.deleteWorkspace(ws.id);
    location.href = '/admin/workspaces';
  };
  return (
    <Card className="space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('ad_ws_company')} htmlFor="g-c"><Input id="g-c" value={f.company} onChange={(e) => set('company', e.target.value)} /></Field>
        <Field label={t('ad_ws_industry')} htmlFor="g-i"><Input id="g-i" value={f.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
        <Field label={t('ad_ws_contact')} htmlFor="g-cn"><Input id="g-cn" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
        <Field label={t('ad_ws_email')} htmlFor="g-ce"><Input id="g-ce" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
        <Field label={t('ad_ws_token')} htmlFor="g-t"><Input id="g-t" value={f.token} onChange={(e) => set('token', e.target.value)} className="font-mono" /></Field>
        <Field label={t('ad_ws_status')} htmlFor="g-s">
          <Select id="g-s" value={f.status} onChange={(e) => set('status', e.target.value as WorkspaceStatus)}>
            <option value="draft">{t('ad_status_draft')}</option><option value="active">{t('ad_status_active')}</option><option value="converted">{t('ad_status_converted')}</option><option value="archived">{t('ad_status_archived')}</option>
          </Select>
        </Field>
        <Field label={t('ad_ws_lang')} htmlFor="g-l"><Select id="g-l" value={f.language} onChange={(e) => set('language', e.target.value as Lang)}><option value="vi">{t('lang_vi')}</option><option value="en">{t('lang_en')}</option></Select></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('ad_ws_credits')} htmlFor="g-cr"><Input id="g-cr" type="number" min={0} value={f.total} onChange={(e) => set('total', Number(e.target.value))} /></Field>
          <Field label="Used" htmlFor="g-cu"><Input id="g-cu" type="number" min={0} value={f.used} onChange={(e) => set('used', Number(e.target.value))} /></Field>
        </div>
        <Field label="Expires (optional)" htmlFor="g-ex"><Input id="g-ex" type="date" value={f.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
        <div className="sm:col-span-2 rounded-xl bg-sand-2 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <Field label={t('ad_ws_budget')} htmlFor="g-bu" help={t('ad_ws_budget_hint')}>
              <Input id="g-bu" type="number" min={0} step={1} value={f.budgetUsd} onChange={(e) => set('budgetUsd', Number(e.target.value))} className="max-w-[160px]" />
            </Field>
            <Button type="button" size="sm" variant="soft" icon="plus" onClick={() => set('budgetUsd', Math.round((f.budgetUsd + 10) * 100) / 100)}>{t('ad_budget_raise')}</Button>
          </div>
          <BudgetMeter spent={ws.spentUsd ?? 0} budget={f.budgetUsd} label={t('ad_ws_spent')} />
        </div>
      </div>
      <Field label={t('ad_ws_brief')} htmlFor="g-b"><Textarea id="g-b" rows={4} value={f.brief} onChange={(e) => set('brief', e.target.value)} /></Field>
      <Field label={t('ad_ws_notes')} htmlFor="g-n"><Textarea id="g-n" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <div className="flex items-center justify-between border-t border-sand-4 pt-4">
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-sm"><span>{t('ad_ws_delete_confirm')}</span><Button size="sm" variant="danger" onClick={del} icon="trash">{t('delete')}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button></span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-coral-11" icon="trash">{t('delete')}</Button>
        )}
        <Button onClick={submit} loading={saving} icon="check">{t('save')}</Button>
      </div>
    </Card>
  );
}

function WorkflowsTab({ ws, catalog, onSave }: { ws: Workspace; catalog: WorkflowDef[]; onSave: (p: Record<string, unknown>) => Promise<void> }) {
  const { t, pick } = useLang();
  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (wid: string) => onSave({ workflowIds: ws.workflowIds.includes(wid) ? ws.workflowIds.filter((x) => x !== wid) : [...ws.workflowIds, wid] });
  return (
    <div className="space-y-3">
      <Alert tone="info" icon="Lightbulb">{t('ad_override_hint')}</Alert>
      {catalog.map((w) => {
        const on = ws.workflowIds.includes(w.id);
        const ov = ws.overrides[w.id];
        return (
          <Card key={w.id} className={`p-4 transition ${on ? '' : 'opacity-70'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" role="switch" aria-checked={on} aria-label={pick(w.name)} onClick={() => toggle(w.id)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-jade-9' : 'bg-sand-6'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <IconTile name={w.icon} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-jade-12">{pick(w.name)} <Badge tone="neutral">{w.kind}</Badge> {ov && <Badge tone="brand" dot>customized</Badge>}</p>
                <p className="text-[12.5px] text-sand-9">{pick(w.tagline)}</p>
              </div>
              {on && <Button size="sm" variant="secondary" icon="PenLine" onClick={() => setEditing(editing === w.id ? null : w.id)}>{t('ad_edit_prompts')}</Button>}
            </div>
            {editing === w.id && on && <OverrideEditor wf={w} override={ov} onChange={(next) => onSave({ overrides: { ...ws.overrides, [w.id]: next } })} onReset={() => { const o = { ...ws.overrides }; delete o[w.id]; void onSave({ overrides: o }); setEditing(null); }} />}
          </Card>
        );
      })}
    </div>
  );
}

function OverrideEditor({ wf, override, onChange, onReset }: { wf: WorkflowDef; override?: WorkflowOverride; onChange: (o: WorkflowOverride) => void; onReset: () => void }) {
  const { t, pick } = useLang();
  const [steps, setSteps] = useState<Record<string, { system: string; prompt: string }>>(() => Object.fromEntries(wf.steps.map((s) => [s.id, { system: override?.steps?.[s.id]?.system ?? s.system, prompt: override?.steps?.[s.id]?.prompt ?? s.prompt }])));
  const [samples, setSamples] = useState<Record<string, string>>(() => Object.fromEntries(wf.inputs.map((f) => [f.key, override?.samples?.[f.key] ?? f.sample])));
  const [chatSystem, setChatSystem] = useState(override?.chatSystem ?? wf.chat?.system ?? '');
  const apply = () => {
    const next: WorkflowOverride = { steps: {}, samples: {} };
    for (const s of wf.steps) {
      const d: { system?: string; prompt?: string } = {};
      if (steps[s.id].system !== s.system) d.system = steps[s.id].system;
      if (steps[s.id].prompt !== s.prompt) d.prompt = steps[s.id].prompt;
      if (Object.keys(d).length) next.steps![s.id] = d;
    }
    for (const f of wf.inputs) if (samples[f.key] !== f.sample) next.samples![f.key] = samples[f.key];
    if (wf.chat && chatSystem !== wf.chat.system) next.chatSystem = chatSystem;
    onChange(next);
  };
  const mono = 'font-mono text-[12px] leading-relaxed';
  return (
    <div className="mt-4 space-y-4 border-t border-sand-4 pt-4 animate-fade">
      {wf.chat && <Field label={t('ad_prompt_system')} htmlFor={`cs-${wf.id}`}><Textarea id={`cs-${wf.id}`} rows={6} value={chatSystem} onChange={(e) => setChatSystem(e.target.value)} className={mono} /></Field>}
      {wf.steps.map((s) => (
        <div key={s.id} className="space-y-3 rounded-xl bg-sand-2 p-4">
          <p className="text-[13.5px] font-semibold text-jade-12">{pick(s.title)} <code className="font-mono text-[11px] text-sand-9">{s.id}</code></p>
          <Field label={t('ad_prompt_system')} htmlFor={`sys-${s.id}`}><Textarea id={`sys-${s.id}`} rows={4} value={steps[s.id].system} onChange={(e) => setSteps({ ...steps, [s.id]: { ...steps[s.id], system: e.target.value } })} className={mono} /></Field>
          <Field label={t('ad_prompt_user')} htmlFor={`pr-${s.id}`}><Textarea id={`pr-${s.id}`} rows={6} value={steps[s.id].prompt} onChange={(e) => setSteps({ ...steps, [s.id]: { ...steps[s.id], prompt: e.target.value } })} className={mono} /></Field>
        </div>
      ))}
      {wf.inputs.map((f) => (
        <Field key={f.key} label={`Sample: ${pick(f.label)}`} htmlFor={`sm-${f.key}`}>
          {f.type === 'textarea' ? <Textarea id={`sm-${f.key}`} rows={4} value={samples[f.key]} onChange={(e) => setSamples({ ...samples, [f.key]: e.target.value })} /> : <Input id={`sm-${f.key}`} value={samples[f.key]} onChange={(e) => setSamples({ ...samples, [f.key]: e.target.value })} />}
        </Field>
      ))}
      <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onReset} icon="rotate">{t('ad_reset_override')}</Button><Button size="sm" onClick={apply} icon="check">{t('save')}</Button></div>
    </div>
  );
}

function KnowledgeTab({ ws, onSave, saving }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const { t } = useLang();
  const [docs, setDocs] = useState<Pick<KnowledgeDoc, 'id' | 'title' | 'content'>[]>(ws.knowledge);
  const add = () => setDocs([...docs, { id: '', title: '', content: '' }]);
  const upd = (i: number, patch: Partial<KnowledgeDoc>) => setDocs(docs.map((d, n) => (n === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      <Alert tone="info" icon="book">{t('ad_ws_knowledge')}</Alert>
      {docs.map((d, i) => (
        <Card key={i} className="space-y-3 p-4">
          <div className="flex gap-2">
            <IconTile name="FileText" size="sm" />
            <Input value={d.title} placeholder={t('ad_kd_title')} onChange={(e) => upd(i, { title: e.target.value })} aria-label={t('ad_kd_title')} />
            <Button variant="ghost" size="sm" onClick={() => setDocs(docs.filter((_, n) => n !== i))} aria-label={t('delete')} className="text-coral-11"><Icon name="trash" size={16} /></Button>
          </div>
          <Textarea rows={8} value={d.content} placeholder={t('ad_kd_content')} onChange={(e) => upd(i, { content: e.target.value })} aria-label={t('ad_kd_content')} className="font-mono text-[12.5px]" />
          <p className="text-right text-[11px] text-sand-9 tnum">{d.content.length.toLocaleString()} chars</p>
        </Card>
      ))}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={add} icon="plus">{t('ad_kd_add')}</Button>
        <Button onClick={() => onSave({ knowledge: docs.filter((d) => d.title.trim() && d.content.trim()) })} loading={saving} icon="check">{t('save')}</Button>
      </div>
    </div>
  );
}

function DataTab({ ws, onSave, saving }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const { t } = useLang();
  const [list, setList] = useState<Pick<DataSource, 'id' | 'name' | 'description' | 'csv'>[]>(ws.dataSources ?? []);
  const [preview, setPreview] = useState<number | null>(null);
  const upd = (i: number, patch: Partial<DataSource>) => setList(list.map((d, n) => (n === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      <Alert tone="info" icon="Table">{t('ad_ds_hint')}</Alert>
      {list.map((d, i) => {
        const parsed = preview === i ? parseCsv(d.csv) : null;
        return (
          <Card key={i} className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <IconTile name="Table" size="sm" />
              <Input value={d.name} placeholder={t('ad_ds_name')} onChange={(e) => upd(i, { name: e.target.value })} aria-label={t('ad_ds_name')} className="font-mono sm:max-w-[200px]" />
              <Input value={d.description} placeholder={t('ad_ds_desc')} onChange={(e) => upd(i, { description: e.target.value })} aria-label={t('ad_ds_desc')} className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setList(list.filter((_, n) => n !== i))} aria-label={t('delete')} className="text-coral-11"><Icon name="trash" size={16} /></Button>
            </div>
            <Textarea rows={7} value={d.csv} placeholder={t('ad_ds_csv')} onChange={(e) => upd(i, { csv: e.target.value })} aria-label={t('ad_ds_csv')} className="font-mono text-[12px]" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-sand-9 tnum">{d.csv.split(/\r?\n/).filter(Boolean).length - 1} {t('sb_rows')} · {d.csv.length.toLocaleString()} chars</p>
              <Button size="sm" variant="ghost" icon="search" onClick={() => setPreview(preview === i ? null : i)}>{t('ad_ds_preview')}</Button>
            </div>
            {parsed && (
              <div className="max-h-64 overflow-auto rounded-xl hairline animate-fade">
                <table className="w-full text-[12px]"><thead className="sticky top-0 bg-sand-3"><tr>{parsed.columns.map((c) => <th key={c} className="px-2 py-1.5 text-left font-semibold text-sand-11">{c}</th>)}</tr></thead>
                  <tbody>{parsed.rows.slice(0, 20).map((r, n) => <tr key={n} className="border-t border-sand-4">{parsed.columns.map((c) => <td key={c} className="px-2 py-1 tnum">{r[c]}</td>)}</tr>)}</tbody></table>
              </div>
            )}
          </Card>
        );
      })}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setList([...list, { id: '', name: '', description: '', csv: '' }])} icon="plus">{t('ad_ds_add')}</Button>
        <Button onClick={() => onSave({ dataSources: list.filter((d) => d.name.trim() && d.csv.trim()) })} loading={saving} icon="check">{t('save')}</Button>
      </div>
    </div>
  );
}

function ConnectorsTab({ ws, onSave, saving }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const { t } = useLang();
  const [list, setList] = useState<McpServer[]>(ws.mcpServers ?? []);
  const upd = (i: number, patch: Partial<McpServer>) => setList(list.map((d, n) => (n === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      <Alert tone="info" icon="Globe">{t('ad_mcp_hint')}</Alert>
      {list.map((m, i) => (
        <Card key={i} className="grid gap-2 p-4 sm:grid-cols-[160px_1fr_1fr_auto]">
          <Input value={m.name} placeholder={t('ad_mcp_name')} onChange={(e) => upd(i, { name: e.target.value })} aria-label={t('ad_mcp_name')} className="font-mono" />
          <Input value={m.url} placeholder={t('ad_mcp_url')} onChange={(e) => upd(i, { url: e.target.value })} aria-label={t('ad_mcp_url')} className="font-mono" />
          <Input value={m.authToken ?? ''} type="password" placeholder={t('ad_mcp_token')} onChange={(e) => upd(i, { authToken: e.target.value })} aria-label={t('ad_mcp_token')} />
          <Button variant="ghost" size="sm" onClick={() => setList(list.filter((_, n) => n !== i))} aria-label={t('delete')} className="text-coral-11"><Icon name="trash" size={16} /></Button>
        </Card>
      ))}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setList([...list, { id: '', name: '', url: '' }])} icon="plus">{t('ad_mcp_add')}</Button>
        <Button onClick={() => onSave({ mcpServers: list.filter((m) => m.name.trim() && m.url.trim()) })} loading={saving} icon="check">{t('save')}</Button>
      </div>
    </div>
  );
}

function CustomTab({ ws, onSave, lang }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; lang: Lang }) {
  const { t, pick } = useLang();
  const [brief, setBrief] = useState('');
  const [json, setJson] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const problems = useMemo(() => {
    if (!json.trim()) return [];
    try { return validateWorkflow(JSON.parse(json)); } catch (e) { return [`JSON: ${(e as Error).message}`]; }
  }, [json]);

  const draft = async () => {
    setDrafting(true);
    setErr(null);
    try {
      const r = await adminApi.draftWorkflow(brief, lang);
      setJson(JSON.stringify(r.workflow, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setDrafting(false);
    }
  };
  const add = async () => {
    const wf = JSON.parse(json) as WorkflowDef;
    const list = ws.customWorkflows.filter((w) => w.id !== wf.id);
    await onSave({ customWorkflows: [...list, wf] });
    setJson('');
  };
  const remove = (wid: string) => onSave({ customWorkflows: ws.customWorkflows.filter((w) => w.id !== wid) });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <IconTile name="Wand2" tone="amber" size="sm" />
          <h2 className="text-[15px] font-bold text-jade-12">{t('ad_tab_custom')}</h2>
        </div>
        <Field label={t('ad_custom_brief')} htmlFor="cb"><Textarea id="cb" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="VD: Phòng kế toán muốn AI đọc email đòi nợ và soạn kế hoạch nhắc thanh toán 3 bước..." /></Field>
        <Button onClick={draft} loading={drafting} disabled={!brief.trim()} icon={drafting ? undefined : 'sparkle'} variant="dark">{drafting ? t('ad_custom_drafting') : t('ad_custom_draft')}</Button>
        {err && <Alert tone="error">{err}</Alert>}
        <Field label={t('ad_custom_json')} htmlFor="cj"><Textarea id="cj" rows={16} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-[12px] leading-relaxed" /></Field>
        {problems.length > 0 && <Alert tone="warn"><p className="font-semibold">{t('ad_custom_problems')}</p><ul className="mt-1 list-disc pl-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></Alert>}
        <Button onClick={add} disabled={!json.trim() || problems.length > 0} icon="plus">{t('ad_custom_add')}</Button>
      </Card>
      <div className="space-y-3">
        <h2 className="text-[15px] font-bold text-jade-12">{t('ad_ws_custom')} <span className="font-mono text-[12px] text-sand-9">({ws.customWorkflows.length})</span></h2>
        {ws.customWorkflows.length === 0 && <p className="rounded-xl border border-dashed border-sand-5 p-6 text-center text-[13.5px] text-sand-9">{t('ad_custom_none')}</p>}
        {ws.customWorkflows.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <IconTile name={w.icon} size="sm" />
                <div>
                  <p className="font-semibold text-jade-12">{pick(w.name)} <code className="font-mono text-[11px] text-sand-9">{w.id}</code></p>
                  <p className="text-[13px] text-sand-10">{pick(w.description)}</p>
                  <p className="mt-1 text-[12px] text-sand-9">{w.inputs.length} inputs · {w.steps.length} steps · {w.minutesSavedPerRun} min</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon="PenLine" onClick={() => setJson(JSON.stringify(w, null, 2))}>{t('ad_edit')}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(w.id)} aria-label={t('delete')} className="text-coral-11"><Icon name="trash" size={16} /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActivityTab({ ws, pick }: { ws: Workspace; pick: (l: { vi: string; en: string }) => string }) {
  const { t, lang } = useLang();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [open, setOpen] = useState<Run | null>(null);
  useEffect(() => {
    adminApi.runs(ws.id).then((r) => setRuns(r.runs)).catch(() => setRuns([]));
    adminApi.leads(ws.id).then((r) => setLeads(r.leads)).catch(() => setLeads([]));
  }, [ws.id]);
  const fmtDate = (s: string) => new Date(s).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  if (!runs || !leads) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="inbox" size={16} className="text-jade-9" /> {t('ad_ws_leads')} <span className="font-mono text-[12px] text-sand-9">({leads.length})</span></h2>
        {leads.length === 0 ? <p className="mt-2 text-sm text-sand-9">{t('ad_no_leads')}</p> : (
          <ul className="mt-3 divide-y divide-sand-4">{leads.map((l) => (
            <li key={l.id} className="py-3 text-sm"><p className="flex flex-wrap items-center gap-2"><Badge tone="brand">{l.type}</Badge> <strong className="text-jade-12">{l.name || '—'}</strong> <span className="text-sand-9">{l.email}</span></p><p className="mt-1 whitespace-pre-wrap text-sand-11">{l.message}</p><p className="mt-1 text-[12px] text-sand-9 tnum">{fmtDate(l.createdAt)}</p></li>
          ))}</ul>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="bolt" size={16} className="text-jade-9" /> {t('ad_ws_runs')} <span className="font-mono text-[12px] text-sand-9">({runs.length})</span></h2>
        {runs.length === 0 ? <p className="mt-2 text-sm text-sand-9">{t('ad_no_runs')}</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-sand-9"><th className="py-2 pr-3 font-semibold">{t('ad_when')}</th><th className="py-2 pr-3 font-semibold">{t('ad_visitor')}</th><th className="py-2 pr-3 font-semibold">{t('ad_workflow')}</th><th className="py-2 pr-3 font-semibold">{t('ad_rating')}</th><th className="py-2 pr-3 font-semibold">USD</th><th></th></tr></thead>
              <tbody>{runs.map((r) => (
                <tr key={r.id} className="border-t border-sand-4 hover:bg-sand-1">
                  <td className="whitespace-nowrap py-2 pr-3 text-sand-10 tnum">{fmtDate(r.startedAt)}</td>
                  <td className="py-2 pr-3">{r.visitorName || '—'}</td>
                  <td className="py-2 pr-3 font-medium text-jade-12">{pick(r.workflowName)} {r.status === 'error' && <Badge tone="danger">error</Badge>}</td>
                  <td className="py-2 pr-3">{r.rating ? <Stars value={r.rating} size="sm" /> : '—'}{r.feedback && <p className="text-[12px] text-sand-9">{r.feedback}</p>}</td>
                  <td className="py-2 pr-3 tnum">{r.costUsd.toFixed(4)}</td>
                  <td className="py-2"><Button size="sm" variant="ghost" onClick={() => setOpen(open?.id === r.id ? null : r)}>{t('res_view')}</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {open && (
          <div className="mt-4 rounded-xl bg-sand-2 p-4 animate-fade">
            <p className="eyebrow mb-2">Inputs</p>
            <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[12px]">{JSON.stringify(open.inputs, null, 2)}</pre>
            <p className="eyebrow mb-2 mt-4">Output</p>
            <div className="paper rounded-lg p-4"><Markdown text={open.output || open.error || ''} /></div>
            {(open.trace?.length ?? 0) > 0 && <p className="mt-3 text-[12px] text-sand-9">{open.trace.length} tool calls · {open.trace.map((c) => c.tool).join(', ')}</p>}
            <div className="mt-4 space-y-4">
              <ArtifactsPanel artifacts={open.artifacts ?? []} urlFor={(a, d) => `/api/sandbox/${encodeURIComponent(ws.token)}/runs/${open.id}/artifacts/${a.id}${d ? '?download' : ''}`} />
              <ActionsPanel actions={open.actions ?? []} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
