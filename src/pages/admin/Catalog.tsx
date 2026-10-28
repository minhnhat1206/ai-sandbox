import { useEffect, useState } from 'react';
import type { WorkflowDef } from '@shared/types';
import { Icon } from '@/components/Icon';
import { Badge, Card, Spinner } from '@/components/ui';
import { useLang } from '@/i18n';
import { adminApi } from '@/lib/api';

export default function Catalog() {
  const { t, pick } = useLang();
  const [list, setList] = useState<WorkflowDef[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { adminApi.catalog().then((r) => setList(r.workflows)).catch(() => setList([])); }, []);
  if (!list) return <Spinner label={t('loading')} />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('ad_nav_catalog')}</h1>
        <p className="text-sm text-ink-700">{t('ad_cat_sub')}</p>
      </div>
      {list.map((w) => (
        <Card key={w.id} className="p-4">
          <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name={w.icon} className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{pick(w.name)} <code className="text-xs text-ink-500">{w.id}</code></span>
              <span className="block text-xs text-ink-500">{pick(w.tagline)}</span>
            </span>
            <Badge tone="neutral">{w.category}</Badge><Badge tone="brand">{w.kind}</Badge>
          </button>
          {open === w.id && (
            <div className="mt-4 space-y-3 border-t border-ink-100 pt-4 text-sm">
              <p>{pick(w.description)}</p>
              <p className="text-xs text-ink-500">{w.minutesSavedPerRun} min/run · {w.inputs.length} inputs · tags: {w.tags.join(', ')} {w.useKnowledge && '· uses knowledge'}</p>
              {w.chat && <pre className="whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-xs">{w.chat.system}</pre>}
              {w.steps.map((s) => (
                <div key={s.id} className="rounded-lg bg-ink-50 p-3">
                  <p className="font-semibold">{pick(s.title)} <code className="text-xs text-ink-500">{s.id}</code></p>
                  <p className="mt-1 text-xs font-semibold uppercase text-ink-500">{t('ad_prompt_system')}</p>
                  <pre className="whitespace-pre-wrap text-xs">{s.system}</pre>
                  <p className="mt-2 text-xs font-semibold uppercase text-ink-500">{t('ad_prompt_user')}</p>
                  <pre className="whitespace-pre-wrap text-xs">{s.prompt}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
