import { BookOpen, Clock, MessageCircle, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkflowCategory } from '@shared/types';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useLang } from '@/i18n';
import { getVisitorName, setVisitorName } from '@/lib/api';
import { useSandbox } from './context';

const CATEGORY_LABEL: Record<WorkflowCategory, { vi: string; en: string }> = {
  operations: { vi: 'Vận hành', en: 'Operations' },
  sales: { vi: 'Kinh doanh', en: 'Sales' },
  marketing: { vi: 'Marketing', en: 'Marketing' },
  finance: { vi: 'Tài chính', en: 'Finance' },
  hr: { vi: 'Nhân sự', en: 'HR' },
  'customer-service': { vi: 'CSKH', en: 'Customer service' },
  general: { vi: 'Chung', en: 'General' },
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
    <div className="space-y-6">
      <section className="animate-rise">
        <h1 className="text-2xl font-bold text-ink-900 md:text-3xl">{t('sb_welcome')} {view.workspace.company} 👋</h1>
        <p className="mt-2 max-w-2xl text-ink-700">{t('sb_welcome_sub', { company: view.workspace.company })}</p>
        {view.knowledgeTitles.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-700">
            <BookOpen className="h-4 w-4 text-brand-700" /> {t('sb_knowledge_connected')}
            {view.knowledgeTitles.map((k) => <Badge key={k} tone="neutral">{k}</Badge>)}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category">
        {(['all', ...categories] as const).map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)} className={`rounded-full px-3 py-1 text-sm font-medium transition ${filter === c ? 'bg-ink-900 text-white' : 'bg-white border border-ink-300 text-ink-700 hover:bg-ink-100'}`}>
            {c === 'all' ? t('sb_filter_all') : pick(CATEGORY_LABEL[c])}
          </button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((w, i) => (
          <Card key={w.id} as="article" className="flex flex-col p-5 animate-rise" >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name={w.icon} className="h-5 w-5" /></span>
              <Badge tone="neutral">{pick(CATEGORY_LABEL[w.category])}</Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">{pick(w.name)}</h2>
            <p className="mt-1 text-sm font-medium text-brand-800">{pick(w.tagline)}</p>
            <p className="mt-2 flex-1 text-sm text-ink-700">{pick(w.description)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t('sb_saves', { n: w.minutesSavedPerRun })}</span>
              {w.kind === 'form' && w.steps.length > 1 && <span>· {t('sb_steps', { n: w.steps.length })}</span>}
              {w.useKnowledge && view.knowledgeTitles.length > 0 && <span>· {t('sb_uses_docs')}</span>}
            </div>
            <Link to={`/s/${token}/${w.kind === 'chat' ? 'chat' : 'run'}/${w.id}`} className="mt-4">
              <Button className="w-full" variant={i === 0 ? 'primary' : 'secondary'}>
                {w.kind === 'chat' ? <><MessageCircle className="h-4 w-4" /> {t('sb_chat')}</> : <><Play className="h-4 w-4" /> {t('sb_try')}</>}
              </Button>
            </Link>
          </Card>
        ))}
      </section>

      <Modal open={showOnboarding} onClose={finishOnboarding} title={t('ob_title')}>
        <ol className="space-y-3">
          {[t('ob_1'), t('ob_2'), t('ob_3')].map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <label htmlFor="visitor" className="block text-sm font-medium">{t('ob_name_label')}</label>
          <Input id="visitor" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ob_name_placeholder')} className="mt-1.5" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={finishOnboarding}>{t('ob_skip')}</Button>
          <Button onClick={finishOnboarding}>{t('ob_start')}</Button>
        </div>
      </Modal>
    </div>
  );
}
