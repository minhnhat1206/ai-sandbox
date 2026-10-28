import { FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Run } from '@shared/types';
import { Badge, Button, Card, EmptyState, Modal, Spinner, Stars, Stat } from '@/components/ui';
import { useLang } from '@/i18n';
import { sandboxApi } from '@/lib/api';
import { Markdown } from '@/lib/markdown';
import { useSandbox } from './context';

export default function MyResults() {
  const { t, pick, lang } = useLang();
  const { token } = useSandbox();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [open, setOpen] = useState<Run | null>(null);

  useEffect(() => { sandboxApi.myRuns(token).then((r) => setRuns(r.runs)).catch(() => setRuns([])); }, [token]);

  if (!runs) return <Spinner label={t('loading')} />;
  const done = runs.filter((r) => r.status === 'done');
  const rated = done.filter((r) => r.rating);
  const hours = done.reduce((n, r) => n + r.minutesSaved, 0) / 60;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('res_title')}</h1>
        <p className="text-ink-700">{t('res_sub')}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('res_runs')} value={done.length} />
        <Stat label={t('res_hours')} value={hours.toFixed(1)} />
        <Stat label={t('res_rating')} value={rated.length ? (rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length).toFixed(1) + ' ★' : '—'} />
      </div>
      {done.length === 0 ? (
        <EmptyState icon={<FileCheck2 className="h-5 w-5" />} title={t('res_empty')} />
      ) : (
        <Card className="divide-y divide-ink-100">
          {done.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{pick(r.workflowName)}</p>
                <p className="text-xs text-ink-500">{new Date(r.startedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} · {r.minutesSaved} {t('minutes')}</p>
              </div>
              {r.rating ? <Stars value={r.rating} size="sm" /> : <Badge tone="neutral">—</Badge>}
              <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>{t('res_view')}</Button>
            </div>
          ))}
        </Card>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? pick(open.workflowName) : ''} wide>
        {open && <Markdown text={open.output} />}
      </Modal>
    </div>
  );
}
