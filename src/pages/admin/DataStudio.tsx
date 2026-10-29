import { useEffect, useState } from 'react';
import { parseCsv } from '@shared/engine/csv';
import type { ColumnKind, DataBlueprint, GeneratedData, Workspace } from '@shared/types';
import { Alert, Badge, Button, Card, Field, IconTile, Input, Select, Textarea, useToast } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi } from '@/lib/api';

const KINDS: ColumnKind[] = ['id', 'text', 'person', 'customer', 'product', 'enum', 'integer', 'money', 'percent', 'date', 'email', 'phone', 'boolean'];
type Upload = { id: string; name: string; mime: string };

const toLines = <T,>(items: T[], fields: (keyof T)[]) => items.map((it) => fields.map((k) => String(it[k] ?? '')).join(' | ')).join('\n');
const fromLines = (text: string) => text.split(/\r?\n/).map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0]);

/**
 * Synthetic-data studio: from call notes, pasted headers, template files or screenshots to a
 * full set of company tables, policy documents and sample inputs, reviewed before applying.
 */
export function DataStudio({ ws, onApplied }: { ws: Workspace; onApplied: (ws: Workspace) => void }) {
  const { t } = useLang();
  const toast = useToast();
  const [open, setOpen] = useState(!(ws.dataSources ?? []).length);
  const [presets, setPresets] = useState<{ key: string; label: string }[]>([]);
  const [form, setForm] = useState({ industry: ws.industry, presetKey: '', notes: ws.brief, headers: '', asOf: new Date().toISOString().slice(0, 10) });
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [bp, setBp] = useState<DataBlueprint | null>(null);
  const [text, setText] = useState({ segments: '', customers: '', products: '' });
  const [data, setData] = useState<GeneratedData | null>(null);
  const [show, setShow] = useState<string | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [setWorkflows, setSetWorkflows] = useState(true);
  const [busy, setBusy] = useState<'' | 'propose' | 'preview' | 'apply' | 'upload'>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { adminApi.presets().then((r) => setPresets(r.presets)).catch(() => undefined); }, []);

  const loadBlueprint = (b: DataBlueprint) => {
    setBp(b);
    setText({ segments: b.profile.segments.join(', '), customers: toLines(b.profile.customers, ['name', 'segment', 'city', 'contact']), products: toLines(b.profile.products, ['name', 'category', 'unit', 'price', 'supplier']) });
    setData(null);
  };

  /** Fold the text editors back into the blueprint before sending it. */
  const edited = (): DataBlueprint | null => {
    if (!bp) return null;
    const segments = text.segments.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
    return {
      ...bp,
      asOf: form.asOf || bp.asOf,
      profile: {
        ...bp.profile,
        segments,
        customers: fromLines(text.customers).map(([name, segment, city, contact]) => ({ name, segment: segments.includes(segment) ? segment : segments[0], city: city || 'Hồ Chí Minh', contact: contact || 'Anh Nam' })),
        products: fromLines(text.products).map(([name, category, unit, price, supplier]) => ({ name, category: category || 'Khác', unit: unit || 'cái', price: Number(String(price).replace(/[^\d]/g, '')) || 0, supplier: supplier || 'Nhà cung cấp chính' })),
      },
    };
  };

  const run = async <T,>(kind: typeof busy, fn: () => Promise<T>) => {
    setBusy(kind);
    setError(null);
    try { return await fn(); } catch (e) { setError(e instanceof Error ? e.message : t('error_generic')); return undefined; } finally { setBusy(''); }
  };

  const propose = () => run('propose', async () => {
    const r = await adminApi.proposeBlueprint({ company: ws.company, industry: form.industry, notes: form.notes, headers: form.headers, presetKey: form.presetKey || undefined, uploadIds: uploads.map((u) => u.id), asOf: form.asOf });
    loadBlueprint(r.blueprint);
  });
  const preview = () => run('preview', async () => {
    const b = edited();
    if (!b) return;
    const r = await adminApi.previewData(b);
    setBp(r.blueprint);
    setData(r.data);
    setShow(null);
  });
  const apply = () => run('apply', async () => {
    const b = edited();
    if (!b) return;
    const r = await adminApi.applyData(ws.id, b, mode, setWorkflows);
    onApplied(r.workspace);
    toast.show(t('ad_dg_applied'));
    setBp(null);
    setData(null);
    setOpen(false);
  });
  const upload = (files: FileList | null) => run('upload', async () => {
    for (const f of Array.from(files ?? []).slice(0, 6)) {
      const u = await adminApi.uploadFile(f);
      setUploads((list) => [...list, { id: u.id, name: u.name, mime: u.mime }]);
    }
  });

  const setTableCol = (ti: number, ci: number, kind: ColumnKind) => bp && setBp({ ...bp, extraTables: bp.extraTables.map((tb, i) => (i === ti ? { ...tb, columns: tb.columns.map((c, j) => (j === ci ? { ...c, kind } : c)) } : tb)) });

  if (!open) {
    return (
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <IconTile name="Wand2" size="sm" tone="amber" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-jade-12">{t('ad_dg_title')}</p>
          <p className="text-[12.5px] text-sand-9">{ws.dataAsOf ? t('ad_dg_current', { date: ws.dataAsOf }) : t('ad_dg_sub')}</p>
        </div>
        <Button variant="secondary" size="sm" icon="Sparkles" onClick={() => setOpen(true)}>{t('ad_dg_open')}</Button>
      </Card>
    );
  }

  const shown = data?.dataSources.find((d) => d.name === show);
  const parsed = shown ? parseCsv(shown.csv) : null;
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <IconTile name="Wand2" size="sm" tone="amber" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-jade-12">{t('ad_dg_title')}</p>
          <p className="text-[12.5px] text-sand-9">{t('ad_dg_sub')}</p>
        </div>
        <Button variant="ghost" size="sm" icon="x" onClick={() => setOpen(false)} aria-label={t('close')} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {/* Step 1: what we know about the prospect */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-sand-10"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-jade-12 text-[11px] text-white">1</span> {t('ad_dg_step1')}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('ad_ws_industry')} htmlFor="dg-ind"><Input id="dg-ind" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
          <Field label={t('ad_dg_preset')} htmlFor="dg-pre">
            <Select id="dg-pre" value={form.presetKey} onChange={(e) => setForm({ ...form, presetKey: e.target.value })}>
              <option value="">{t('ad_dg_preset_auto')}</option>
              {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label={t('ad_dg_asof')} htmlFor="dg-asof" help={t('ad_dg_asof_help')}><Input id="dg-asof" type="date" value={form.asOf} onChange={(e) => setForm({ ...form, asOf: e.target.value })} /></Field>
        </div>
        <Field label={t('ad_dg_notes')} htmlFor="dg-notes" help={t('ad_dg_notes_help')}><Textarea id="dg-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Field label={t('ad_dg_headers')} htmlFor="dg-head" help={t('ad_dg_headers_help')}>
          <Textarea id="dg-head" rows={3} value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} className="font-mono text-[12px]" placeholder="Phiếu xuất kho: Số phiếu, Ngày xuất, Khách hàng, Mã hàng, Số lượng, Đơn giá, Thành tiền" />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <label className="press inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-sand-12 hairline-strong hover:bg-sand-1">
            <Icon name={busy === 'upload' ? 'loader' : 'paperclip'} size={15} /> {t('ad_dg_files')}
            <input type="file" multiple accept=".csv,.txt,.md,.pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ''; }} />
          </label>
          {uploads.map((u) => (
            <Badge key={u.id} tone="info"><Icon name={u.mime.startsWith('image/') ? 'search' : 'FileText'} size={12} /> {u.name}
              <button type="button" aria-label={t('delete')} onClick={() => setUploads(uploads.filter((x) => x.id !== u.id))} className="ml-1 opacity-60 hover:opacity-100"><Icon name="x" size={11} /></button>
            </Badge>
          ))}
          <span className="text-[12px] text-sand-9">{t('ad_dg_files_help')}</span>
        </div>
        <Button onClick={propose} loading={busy === 'propose'} icon="Sparkles">{bp ? t('ad_dg_propose_again') : t('ad_dg_propose')}</Button>
      </section>

      {/* Step 2: review the proposal */}
      {bp && (
        <section className="space-y-4 border-t border-sand-4 pt-5 animate-fade">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-sand-10"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-jade-12 text-[11px] text-white">2</span> {t('ad_dg_step2')} <Badge tone={bp.source === 'ai' ? 'brand' : 'neutral'}>{bp.source === 'ai' ? t('ad_dg_by_ai') : t('ad_dg_by_preset')}</Badge></h3>
          {bp.notes.length > 0 && <Alert tone="warn" icon="Lightbulb"><ul className="list-disc space-y-1 pl-4">{bp.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('ad_dg_label')} htmlFor="dg-label"><Input id="dg-label" value={bp.profile.label} onChange={(e) => setBp({ ...bp, profile: { ...bp.profile, label: e.target.value } })} /></Field>
            <Field label={t('ad_dg_segments')} htmlFor="dg-seg" help={t('ad_dg_segments_help')}><Input id="dg-seg" value={text.segments} onChange={(e) => setText({ ...text, segments: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label={t('ad_dg_customers')} htmlFor="dg-cus" help={t('ad_dg_customers_help')}><Textarea id="dg-cus" rows={9} value={text.customers} onChange={(e) => setText({ ...text, customers: e.target.value })} className="font-mono text-[11.5px]" /></Field>
            <Field label={t('ad_dg_products')} htmlFor="dg-pro" help={t('ad_dg_products_help')}><Textarea id="dg-pro" rows={9} value={text.products} onChange={(e) => setText({ ...text, products: e.target.value })} className="font-mono text-[11.5px]" /></Field>
          </div>
          {bp.extraTables.length > 0 && (
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-sand-11">{t('ad_dg_extra')}</p>
              {bp.extraTables.map((tb, ti) => (
                <div key={tb.name} className="rounded-xl bg-sand-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[12.5px] font-semibold text-jade-11">{tb.name}</code>
                    <span className="text-[12px] text-sand-9">{tb.description} · {tb.rows} {t('sb_rows')}</span>
                    <Button size="sm" variant="ghost" className="ml-auto text-coral-11" aria-label={t('delete')} onClick={() => setBp({ ...bp, extraTables: bp.extraTables.filter((_, i) => i !== ti) })}><Icon name="trash" size={14} /></Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tb.columns.map((c, ci) => (
                      <label key={c.name} className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[12px] hairline">
                        <span className="text-sand-12">{c.label}</span>
                        <select aria-label={`${c.label}: ${t('ad_dg_kind')}`} value={c.kind} onChange={(e) => setTableCol(ti, ci, e.target.value as ColumnKind)} className="rounded bg-sand-2 px-1 text-[11px] text-sand-11">
                          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-[13px] font-semibold text-sand-11">{t('ad_dg_workflows')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{bp.workflowIds.map((id) => <Badge key={id} tone="brand">{id}</Badge>)}</div>
          </div>
          <Button variant="secondary" onClick={preview} loading={busy === 'preview'} icon="Table">{t('ad_dg_preview')}</Button>
        </section>
      )}

      {/* Step 3: preview and apply */}
      {data && bp && (
        <section className="space-y-4 border-t border-sand-4 pt-5 animate-fade">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-sand-10"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-jade-12 text-[11px] text-white">3</span> {t('ad_dg_step3')}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.dataSources.map((d) => (
              <button type="button" key={d.name} onClick={() => setShow(show === d.name ? null : d.name)} aria-pressed={show === d.name} className={`rounded-xl p-3 text-left transition hairline ${show === d.name ? 'bg-jade-3' : 'bg-white hover:bg-sand-1'}`}>
                <p className="flex items-center gap-2 font-mono text-[12.5px] font-semibold text-jade-12"><Icon name="Table" size={14} /> {d.name} <span className="ml-auto font-sans text-[11px] font-normal text-sand-9 tnum">{d.rows} {t('sb_rows')}</span></p>
                <p className="mt-1 line-clamp-2 text-[11.5px] text-sand-9">{d.description}</p>
              </button>
            ))}
          </div>
          {parsed && (
            <div className="max-h-72 overflow-auto rounded-xl hairline animate-fade">
              <table className="w-full text-[12px]"><thead className="sticky top-0 bg-sand-3"><tr>{parsed.columns.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1.5 text-left font-semibold text-sand-11">{c}</th>)}</tr></thead>
                <tbody>{parsed.rows.slice(0, 10).map((r, n) => <tr key={n} className="border-t border-sand-4">{parsed.columns.map((c) => <td key={c} className="whitespace-nowrap px-2 py-1 tnum">{r[c]}</td>)}</tr>)}</tbody></table>
            </div>
          )}
          <p className="text-[12.5px] text-sand-10"><Icon name="book" size={13} className="inline" /> {t('ad_dg_docs', { n: data.knowledge.length })}: {data.knowledge.map((k) => k.title).join(' · ')}</p>
          <p className="text-[12.5px] text-sand-10"><Icon name="Wand2" size={13} className="inline" /> {t('ad_dg_samples', { n: Object.keys(data.samples).length })}</p>
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-sand-2 p-3 text-[13px]">
            <label className="inline-flex items-center gap-2"><input type="radio" name="dg-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> {t('ad_dg_mode_replace')}</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="dg-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} /> {t('ad_dg_mode_merge')}</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={setWorkflows} onChange={(e) => setSetWorkflows(e.target.checked)} /> {t('ad_dg_set_workflows', { n: bp.workflowIds.length })}</label>
          </div>
          <Button onClick={apply} loading={busy === 'apply'} icon="check">{t('ad_dg_apply')}</Button>
          <p className="text-[12px] text-sand-9">{t('ad_dg_synthetic_note')}</p>
        </section>
      )}
    </Card>
  );
}
