import { useEffect, useState } from 'react';
import type { Run } from '@shared/types';
import { EmptyArt } from '@/components/illustrations';
import { Badge, Button, EmptyState, IconTile, Modal, SectionHead, Skeleton, Stars } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { sandboxApi } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

export default function MyResults() {
  const { t, pick, lang } = useLang();
  const { token, view } = useSandbox();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [open, setOpen] = useState<Run | null>(null);

  useEffect(() => { sandboxApi.myRuns(token).then((r) => setRuns(r.runs)).catch(() => setRuns([])); }, [token]);

  if (!runs) return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  const done = runs.filter((r) => r.status === 'done');
  const rated = done.filter((r) => r.rating);
  const hours = done.reduce((n, r) => n + r.minutesSaved, 0) / 60;
  const avg = rated.length ? rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length : null;
  const iconOf = (id: string) => view.workflows.find((w) => w.id === id)?.icon ?? 'Sparkles';

  return (
    <div className="space-y-6">
      <SectionHead title={t('res_title')} sub={t('res_sub')} />
      {/* hero figure */}
      <section className="grain relative overflow-hidden rounded-xl3 bg-ink-900 p-6 text-white md:p-8 animate-rise">
        <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-jade-8/30 blur-[80px]" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr_1fr] md:items-end">
          <div>
            <p className="eyebrow text-jade-5">{t('res_hours')}</p>
            <p className="display mt-2 text-[56px] font-extrabold tnum md:text-[72px]">{hours.toFixed(1)}<span className="ml-2 text-[20px] font-semibold text-white/60">h</span></p>
          </div>
          <div className="border-l border-white/10 pl-6">
            <p className="eyebrow text-jade-5">{t('res_runs')}</p>
            <p className="mt-2 text-[32px] font-bold tnum">{done.length}</p>
          </div>
          <div className="border-l border-white/10 pl-6">
            <p className="eyebrow text-jade-5">{t('res_rating')}</p>
            <p className="mt-2 flex items-center gap-2 text-[32px] font-bold tnum">{avg ? avg.toFixed(1) : '—'} {avg && <Icon name="starFilled" size={22} className="text-amber-6" />}</p>
          </div>
        </div>
      </section>

      {done.length === 0 ? (
        <EmptyState art={<EmptyArt className="w-full text-jade-9" />} title={t('res_empty')} />
      ) : (
        <div className="overflow-hidden rounded-xl2 bg-white hairline shadow-[var(--shadow-card)] animate-rise delay-1">
          {done.map((r, i) => (
            <div key={r.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-sand-4' : ''}`}>
              <IconTile name={iconOf(r.workflowId)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-jade-12">{pick(r.workflowName)}</p>
                <p className="text-[12px] text-sand-9 tnum">{new Date(r.startedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} · {r.minutesSaved} {t('minutes')}</p>
              </div>
              {r.rating ? <Stars value={r.rating} size="sm" /> : <Badge tone="neutral">—</Badge>}
              <Button size="sm" variant="secondary" onClick={() => setOpen(r)} icon="FileText">{t('res_view')}</Button>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? pick(open.workflowName) : ''} wide eyebrow={t('run_result')}>
        {open && <Markdown text={open.output} />}
      </Modal>
    </div>
  );
}
