import { useEffect, useState } from 'react';
import type { WorkflowDef } from '@shared/types';
import { Badge, IconTile, SectionHead, Skeleton } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi } from '@/lib/api';

export default function Catalog() {
  const { t, pick } = useLang();
  const [list, setList] = useState<WorkflowDef[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { adminApi.catalog().then((r) => setList(r.workflows)).catch(() => setList([])); }, []);
  if (!list) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  return (
    <div className="space-y-6">
      <SectionHead title={t('ad_nav_catalog')} sub={t('ad_cat_sub')} />
      <div className="space-y-3">
        {list.map((w) => {
          const isOpen = open === w.id;
          return (
            <div key={w.id} className={`rounded-xl2 bg-white hairline shadow-[var(--shadow-card)] transition ${isOpen ? 'ring-2 ring-jade-5' : ''}`}>
              <button className="flex w-full items-center gap-4 p-4 text-left" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen}>
                <IconTile name={w.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-jade-12">{pick(w.name)} <code className="ml-1 font-mono text-[11px] text-sand-9">{w.id}</code></span>
                  <span className="block text-[12.5px] text-sand-9">{pick(w.tagline)}</span>
                </span>
                <Badge tone="neutral">{w.category}</Badge><Badge tone="brand">{w.kind}</Badge>
                <Icon name="chevronDown" size={16} className={`text-sand-8 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-sand-4 px-4 pb-4 pt-4 text-sm animate-fade">
                  <p className="text-sand-11">{pick(w.description)}</p>
                  <p className="text-[12px] text-sand-9">{w.minutesSavedPerRun} min/run · {w.inputs.length} inputs · tags: {w.tags.join(', ')} {w.useKnowledge && '· uses knowledge'}</p>
                  {w.chat && <pre className="whitespace-pre-wrap rounded-xl bg-sand-2 p-3 font-mono text-[12px] leading-relaxed text-sand-11">{w.chat.system}</pre>}
                  {w.steps.map((s) => (
                    <div key={s.id} className="rounded-xl bg-sand-2 p-3">
                      <p className="font-semibold text-jade-12">{pick(s.title)} <code className="font-mono text-[11px] text-sand-9">{s.id}</code></p>
                      <p className="eyebrow mt-2">{t('ad_prompt_system')}</p>
                      <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-sand-11">{s.system}</pre>
                      <p className="eyebrow mt-3">{t('ad_prompt_user')}</p>
                      <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-sand-11">{s.prompt}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
