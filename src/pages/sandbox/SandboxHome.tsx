import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkflowCategory } from '@shared/types';
import { CAP_ICON, capabilitiesOf } from '@/components/AgentPanel';
import { Badge, Button, IconTile, Input, Modal } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang, type DictKeyLoose } from '@/i18n';
import { getVisitorName, setVisitorName } from '@/lib/api';
import { useSandbox } from './context';

const CATEGORY_LABEL: Record<WorkflowCategory, { vi: string; en: string; icon: string }> = {
  operations: { vi: 'Vận hành', en: 'Operations', icon: 'ClipboardList' },
  sales: { vi: 'Kinh doanh', en: 'Sales', icon: 'Send' },
  marketing: { vi: 'Marketing', en: 'Marketing', icon: 'Megaphone' },
  finance: { vi: 'Tài chính', en: 'Finance', icon: 'Receipt' },
  hr: { vi: 'Nhân sự', en: 'HR', icon: 'Users' },
  'customer-service': { vi: 'CSKH', en: 'Customer service', icon: 'Headset' },
  management: { vi: 'Quản trị', en: 'Management', icon: 'Building2' },
  general: { vi: 'Chung', en: 'General', icon: 'Sparkles' },
};

const ONBOARDED_KEY = 'sandbox.onboarded';

export default function SandboxHome() {
  const { t, pick } = useLang();
  const { token, view } = useSandbox();
  const [filter, setFilter] = useState<WorkflowCategory | 'all'>('all');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDED_KEY); } catch { return false; }
  });
  const [name, setName] = useState(getVisitorName());

  const categories = useMemo(() => Array.from(new Set(view.workflows.map((w) => w.category))), [view.workflows]);
  const list = view.workflows.filter((w) => filter === 'all' || w.category === filter);

  const finishOnboarding = () => {
    setVisitorName(name.trim());
    try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* ignore */ }
    setShowOnboarding(false);
  };

  return (
    <div className="space-y-7">
      {/* welcome band */}
      <section className="grain relative overflow-hidden rounded-xl3 bg-ink-900 px-6 py-8 text-white md:px-10 md:py-10 animate-rise">
        <div className="pointer-events-none absolute inset-0 dotfield-dark opacity-50" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-jade-8/30 blur-[90px]" />
        <div className="relative">
          <p className="eyebrow text-jade-5">{view.workspace.industry || t('brand_sandbox')}</p>
          <h1 className="display mt-2 text-[30px] font-extrabold md:text-[40px]">{t('sb_welcome')} {view.workspace.company} <span className="inline-block animate-float">👋</span></h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-white/70">{t('sb_welcome_sub', { company: view.workspace.company })}</p>
          {view.knowledgeTitles.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] text-white/70">
              <Icon name="book" size={16} className="text-amber-6" /> {t('sb_knowledge_connected')}
              {view.knowledgeTitles.map((k) => <span key={k} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-medium text-white ring-1 ring-white/15">{k}</span>)}
            </div>
          )}
          {(view.dataSources.length > 0 || view.connectors.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-white/70">
              <Icon name="Table" size={16} className="text-amber-6" /> {t('sb_data_connected')}
              {view.dataSources.map((d) => <span key={d.id} className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11.5px] font-medium text-white ring-1 ring-white/15" title={d.description}>{d.name} · {d.rows} {t('sb_rows')}</span>)}
              {view.connectors.map((c) => <span key={c} className="rounded-full bg-amber-9/30 px-2.5 py-0.5 font-mono text-[11.5px] font-medium text-white ring-1 ring-amber-6/40">MCP · {c}</span>)}
            </div>
          )}
        </div>
      </section>

      {/* category chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Category">
        {(['all', ...categories] as const).map((c) => {
          const active = filter === c;
          return (
            <button key={c} role="tab" aria-selected={active} onClick={() => setFilter(c)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${active ? 'bg-jade-12 text-white shadow-[0_6px_16px_-8px_rgb(11_47_39/.8)]' : 'bg-white text-sand-11 hairline hover:bg-sand-1'}`}>
              {c !== 'all' && <Icon name={CATEGORY_LABEL[c].icon} size={14} className={active ? 'text-jade-5' : 'text-jade-9'} />}
              {c === 'all' ? t('sb_filter_all') : pick(CATEGORY_LABEL[c])}
            </button>
          );
        })}
      </div>

      {/* gallery */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((w, i) => {
          const first = i === 0 && filter === 'all';
          return (
            <article key={w.id} className={`group relative flex flex-col rounded-xl2 bg-white p-5 hairline shadow-[var(--shadow-card)] hover-lift animate-rise delay-${Math.min(i, 6)} ${first ? 'ring-2 ring-jade-6/60' : ''}`}>
              {first && <span className="absolute -top-2.5 left-5 rounded-full bg-amber-9 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow">{t('sb_start_here')}</span>}
              <div className="flex items-start justify-between gap-3">
                <IconTile name={w.icon} />
                <Badge tone="neutral">{pick(CATEGORY_LABEL[w.category])}</Badge>
              </div>
              <h2 className="mt-4 text-[17px] font-bold tracking-tight text-jade-12">{pick(w.name)}</h2>
              <p className="mt-1 text-[13.5px] font-medium text-jade-10">{pick(w.tagline)}</p>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-sand-10">{pick(w.description)}</p>
              {capabilitiesOf(w, view.connectors.length).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {capabilitiesOf(w, view.connectors.length).map((c) => <span key={c} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${c === 'cap_agent' ? 'bg-jade-12 text-white' : 'bg-jade-3 text-jade-11'}`}><Icon name={CAP_ICON[c]} size={11} /> {t(c as DictKeyLoose)}</span>)}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-sand-9">
                <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} /> {t('sb_saves', { n: w.minutesSavedPerRun })}</span>
                {w.kind === 'form' && w.steps.length > 1 && <span className="inline-flex items-center gap-1"><Icon name="ListChecks" size={13} /> {t('sb_steps', { n: w.steps.length })}</span>}
                {w.useKnowledge && view.knowledgeTitles.length > 0 && <span className="inline-flex items-center gap-1"><Icon name="book" size={13} /> {t('sb_uses_docs')}</span>}
              </div>
              <Link to={`/s/${token}/${w.kind === 'chat' ? 'chat' : 'run'}/${w.id}`} className="mt-4">
                <Button className="w-full" variant={first ? 'primary' : 'secondary'} icon={w.kind === 'chat' ? 'chat' : 'play'}>
                  {w.kind === 'chat' ? t('sb_chat') : t('sb_try')}
                </Button>
              </Link>
            </article>
          );
        })}
      </section>

      <Modal open={showOnboarding} onClose={finishOnboarding} title={t('ob_title')} eyebrow={view.workspace.company}>
        <ol className="space-y-3">
          {[t('ob_1'), t('ob_2'), t('ob_3')].map((s, i) => (
            <li key={i} className={`flex gap-3 rounded-xl bg-sand-2 p-3 text-[14px] text-sand-11 animate-rise delay-${i + 1}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-jade-12 font-mono text-[12px] font-bold text-white">{i + 1}</span>
              <span className="pt-1">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <label htmlFor="visitor" className="block text-[13px] font-semibold">{t('ob_name_label')}</label>
          <Input id="visitor" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ob_name_placeholder')} className="mt-1.5" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={finishOnboarding}>{t('ob_skip')}</Button>
          <Button onClick={finishOnboarding} icon="sparkle">{t('ob_start')}</Button>
        </div>
      </Modal>
    </div>
  );
}
