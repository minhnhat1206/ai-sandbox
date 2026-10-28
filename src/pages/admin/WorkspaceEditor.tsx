import { ArrowLeft, Check, Copy, ExternalLink, Plus, Trash2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { validateWorkflow } from '@shared/engine/validate';
import type { KnowledgeDoc, Lang, Lead, Run, WorkflowDef, WorkflowOverride, Workspace, WorkspaceStatus } from '@shared/types';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner, Stars, Textarea } from '@/components/ui';
import { useLang } from '@/i18n';
import { adminApi } from '@/lib/api';
import { Markdown } from '@/lib/markdown';

type Tab = 'general' | 'workflows' | 'knowledge' | 'custom' | 'activity';

export default function WorkspaceEditor() {
  const { id = '' } = useParams();
  const { t, pick, lang } = useLang();
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error_generic'));
    } finally {
      setSaving(false);
    }
  }, [ws, t]);

  if (error && !ws) return <Alert tone="error">{error}</Alert>;
  if (!ws) return <Spinner label={t('loading')} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: t('ad_tab_general') },
    { id: 'workflows', label: t('ad_tab_workflows') },
    { id: 'knowledge', label: t('ad_tab_knowledge') },
    { id: 'custom', label: t('ad_tab_custom') },
    { id: 'activity', label: t('ad_tab_activity') },
  ];

  return (
    <div className="space-y-5">
      <Link to="/admin/workspaces" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> {t('back')}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ws.company}</h1>
          <p className="text-sm text-ink-500">{ws.industry || '—'} · <Badge tone="neutral">{ws.status}</Badge></p>
        </div>
        <ShareBox token={ws.token} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-100" role="tablist">
        {tabs.map((tb) => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${tab === tb.id ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-900'}`}>{tb.label}</button>
        ))}
        <span className="ml-auto self-center text-xs text-ink-500">{saving ? t('loading') : savedAt ? `${t('saved')} ✓` : ''}</span>
      </div>

      {tab === 'general' && <GeneralTab ws={ws} onSave={save} saving={saving} />}
      {tab === 'workflows' && <WorkflowsTab ws={ws} catalog={catalog} onSave={save} />}
      {tab === 'knowledge' && <KnowledgeTab ws={ws} onSave={save} saving={saving} />}
      {tab === 'custom' && <CustomTab ws={ws} onSave={save} lang={lang} />}
      {tab === 'activity' && <ActivityTab ws={ws} pick={pick} />}
    </div>
  );
}

function ShareBox({ token }: { token: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}/s/${token}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm">
      <span className="text-ink-500">{t('ad_ws_share')}:</span>
      <code className="text-brand-800">{url}</code>
      <Button size="sm" variant="secondary" onClick={copy}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t('copied') : t('ad_copy_link')}</Button>
      <a href={url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /> {t('ad_open_link')}</Button></a>
    </div>
  );
}

function GeneralTab({ ws, onSave, saving }: { ws: Workspace; onSave: (p: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const { t } = useLang();
  const [f, setF] = useState({ company: ws.company, industry: ws.industry, contactName: ws.contactName, contactEmail: ws.contactEmail, language: ws.language, brief: ws.brief, notes: ws.notes, token: ws.token, status: ws.status, total: ws.credits.total, used: ws.credits.used, expiresAt: ws.expiresAt ? ws.expiresAt.slice(0, 10) : '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => onSave({ ...f, credits: { total: f.total, used: f.used }, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null });
  const del = async () => {
    await adminApi.deleteWorkspace(ws.id);
    location.href = '/admin/workspaces';
  };
  return (
    <Card className="p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('ad_ws_company')} htmlFor="g-c"><Input id="g-c" value={f.company} onChange={(e) => set('company', e.target.value)} /></Field>
        <Field label={t('ad_ws_industry')} htmlFor="g-i"><Input id="g-i" value={f.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
        <Field label={t('ad_ws_contact')} htmlFor="g-cn"><Input id="g-cn" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
        <Field label={t('ad_ws_email')} htmlFor="g-ce"><Input id="g-ce" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
        <Field label={t('ad_ws_token')} htmlFor="g-t"><Input id="g-t" value={f.token} onChange={(e) => set('token', e.target.value)} /></Field>
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
      </div>
      <Field label={t('ad_ws_brief')} htmlFor="g-b"><Textarea id="g-b" rows={4} value={f.brief} onChange={(e) => set('brief', e.target.value)} /></Field>
      <Field label={t('ad_ws_notes')} htmlFor="g-n"><Textarea id="g-n" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <div className="flex items-center justify-between">
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-sm"><span>{t('ad_ws_delete_confirm')}</span><Button size="sm" variant="danger" onClick={del}>{t('delete')}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button></span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-600"><Trash2 className="h-4 w-4" /> {t('delete')}</Button>
        )}
        <Button onClick={submit} loading={saving}>{t('save')}</Button>
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
      <p className="text-sm text-ink-700">{t('ad_override_hint')}</p>
      {catalog.map((w) => {
        const on = ws.workflowIds.includes(w.id);
        const ov = ws.overrides[w.id];
        return (
          <Card key={w.id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" checked={on} onChange={() => toggle(w.id)} aria-label={pick(w.name)} className="h-4 w-4" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{pick(w.name)} <Badge tone="neutral">{w.kind}</Badge> {ov && <Badge tone="brand">customized</Badge>}</p>
                <p className="text-xs text-ink-500">{pick(w.tagline)}</p>
              </div>
              {on && <Button size="sm" variant="secondary" onClick={() => setEditing(editing === w.id ? null : w.id)}>{t('ad_edit_prompts')}</Button>}
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
  return (
    <div className="mt-4 space-y-4 border-t border-ink-100 pt-4">
      {wf.chat && <Field label={t('ad_prompt_system')} htmlFor={`cs-${wf.id}`}><Textarea id={`cs-${wf.id}`} rows={6} value={chatSystem} onChange={(e) => setChatSystem(e.target.value)} className="font-mono text-xs" /></Field>}
      {wf.steps.map((s) => (
        <div key={s.id} className="space-y-2 rounded-xl bg-ink-50 p-3">
          <p className="text-sm font-semibold">{pick(s.title)} <code className="text-xs text-ink-500">{s.id}</code></p>
          <Field label={t('ad_prompt_system')} htmlFor={`sys-${s.id}`}><Textarea id={`sys-${s.id}`} rows={4} value={steps[s.id].system} onChange={(e) => setSteps({ ...steps, [s.id]: { ...steps[s.id], system: e.target.value } })} className="font-mono text-xs" /></Field>
          <Field label={t('ad_prompt_user')} htmlFor={`pr-${s.id}`}><Textarea id={`pr-${s.id}`} rows={6} value={steps[s.id].prompt} onChange={(e) => setSteps({ ...steps, [s.id]: { ...steps[s.id], prompt: e.target.value } })} className="font-mono text-xs" /></Field>
        </div>
      ))}
      {wf.inputs.map((f) => (
        <Field key={f.key} label={`Sample: ${pick(f.label)}`} htmlFor={`sm-${f.key}`}>
          {f.type === 'textarea' ? <Textarea id={`sm-${f.key}`} rows={4} value={samples[f.key]} onChange={(e) => setSamples({ ...samples, [f.key]: e.target.value })} /> : <Input id={`sm-${f.key}`} value={samples[f.key]} onChange={(e) => setSamples({ ...samples, [f.key]: e.target.value })} />}
        </Field>
      ))}
      <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onReset}>{t('ad_reset_override')}</Button><Button size="sm" onClick={apply}>{t('save')}</Button></div>
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
      <p className="text-sm text-ink-700">{t('ad_ws_knowledge')}</p>
      {docs.map((d, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input value={d.title} placeholder={t('ad_kd_title')} onChange={(e) => upd(i, { title: e.target.value })} aria-label={t('ad_kd_title')} />
            <Button variant="ghost" size="sm" onClick={() => setDocs(docs.filter((_, n) => n !== i))} aria-label={t('delete')}><Trash2 className="h-4 w-4 text-red-600" /></Button>
          </div>
          <Textarea rows={8} value={d.content} placeholder={t('ad_kd_content')} onChange={(e) => upd(i, { content: e.target.value })} aria-label={t('ad_kd_content')} />
        </Card>
      ))}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={add}><Plus className="h-4 w-4" /> {t('ad_kd_add')}</Button>
        <Button onClick={() => onSave({ knowledge: docs.filter((d) => d.title.trim() && d.content.trim()) })} loading={saving}>{t('save')}</Button>
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
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4 text-brand-700" /> {t('ad_tab_custom')}</h2>
        <Field label={t('ad_custom_brief')} htmlFor="cb"><Textarea id="cb" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="VD: Phòng kế toán muốn AI đọc email đòi nợ và soạn kế hoạch nhắc thanh toán 3 bước..." /></Field>
        <Button onClick={draft} loading={drafting} disabled={!brief.trim()}>{drafting ? t('ad_custom_drafting') : t('ad_custom_draft')}</Button>
        {err && <Alert tone="error">{err}</Alert>}
        <Field label={t('ad_custom_json')} htmlFor="cj"><Textarea id="cj" rows={16} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-xs" /></Field>
        {problems.length > 0 && <Alert tone="warn"><p className="font-medium">{t('ad_custom_problems')}</p><ul className="mt-1 list-disc pl-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></Alert>}
        <Button onClick={add} disabled={!json.trim() || problems.length > 0}><Plus className="h-4 w-4" /> {t('ad_custom_add')}</Button>
      </Card>
      <div className="space-y-3">
        <h2 className="font-semibold">{t('ad_ws_custom')} ({ws.customWorkflows.length})</h2>
        {ws.customWorkflows.length === 0 && <p className="text-sm text-ink-500">{t('ad_custom_none')}</p>}
        {ws.customWorkflows.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{pick(w.name)} <code className="text-xs text-ink-500">{w.id}</code></p>
                <p className="text-sm text-ink-700">{pick(w.description)}</p>
                <p className="mt-1 text-xs text-ink-500">{w.inputs.length} inputs · {w.steps.length} steps · {w.minutesSavedPerRun} min</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setJson(JSON.stringify(w, null, 2))}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(w.id)} aria-label={t('delete')}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
  if (!runs || !leads) return <Spinner label={t('loading')} />;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-semibold">{t('ad_ws_leads')} ({leads.length})</h2>
        {leads.length === 0 ? <p className="mt-2 text-sm text-ink-500">{t('ad_no_leads')}</p> : (
          <ul className="mt-3 divide-y divide-ink-100">{leads.map((l) => (
            <li key={l.id} className="py-2 text-sm"><Badge tone="brand">{l.type}</Badge> <strong>{l.name || '—'}</strong> <span className="text-ink-500">{l.email}</span><p className="mt-1 whitespace-pre-wrap text-ink-700">{l.message}</p><p className="text-xs text-ink-500">{fmtDate(l.createdAt)}</p></li>
          ))}</ul>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">{t('ad_ws_runs')} ({runs.length})</h2>
        {runs.length === 0 ? <p className="mt-2 text-sm text-ink-500">{t('ad_no_runs')}</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-ink-500"><th className="py-1 pr-3">{t('ad_when')}</th><th className="py-1 pr-3">{t('ad_visitor')}</th><th className="py-1 pr-3">{t('ad_workflow')}</th><th className="py-1 pr-3">{t('ad_rating')}</th><th className="py-1 pr-3">USD</th><th></th></tr></thead>
              <tbody>{runs.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(r.startedAt)}</td>
                  <td className="py-1.5 pr-3">{r.visitorName || '—'}</td>
                  <td className="py-1.5 pr-3">{pick(r.workflowName)} {r.status === 'error' && <Badge tone="danger">error</Badge>}</td>
                  <td className="py-1.5 pr-3">{r.rating ? <Stars value={r.rating} size="sm" /> : '—'}{r.feedback && <p className="text-xs text-ink-500">{r.feedback}</p>}</td>
                  <td className="py-1.5 pr-3">{r.costUsd.toFixed(4)}</td>
                  <td className="py-1.5"><Button size="sm" variant="ghost" onClick={() => setOpen(open?.id === r.id ? null : r)}>{t('res_view')}</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {open && (
          <div className="mt-4 rounded-xl bg-ink-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-ink-500">Inputs</p>
            <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-xs">{JSON.stringify(open.inputs, null, 2)}</pre>
            <p className="mb-2 mt-3 text-xs font-semibold uppercase text-ink-500">Output</p>
            <div className="rounded-lg bg-white p-3"><Markdown text={open.output || open.error || ''} /></div>
          </div>
        )}
      </Card>
    </div>
  );
}
