import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminOverview, Run } from '@shared/types';
import { BarList, ColumnChart } from '@/components/charts';
import { Alert, Badge, Card, SectionHead, Skeleton, Stars, Stat } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi, ApiError, setAdminToken } from '@/lib/api';

export default function Dashboard() {
  const { t, pick, lang } = useLang();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [allRuns, setAllRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.overview().then(setData).catch((e) => {
      if (e instanceof ApiError && e.status === 401) { setAdminToken(''); location.href = '/admin/login'; }
      else setError(String(e));
    });
    adminApi.workspaces().then(async (r) => {
      const lists = await Promise.all(r.workspaces.map((w) => adminApi.runs(w.id).then((x) => x.runs).catch(() => [])));
      setAllRuns(lists.flat());
    }).catch(() => undefined);
  }, []);

  const byDay = useMemo(() => {
    const days: { label: string; value: number; hint: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, hint: d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US'), value: allRuns.filter((r) => r.startedAt.slice(0, 10) === key).length });
    }
    return days;
  }, [allRuns, lang]);
  const popular = useMemo(() => {
    const m = new Map<string, { label: string; value: number }>();
    for (const r of allRuns) {
      const cur = m.get(r.workflowId) ?? { label: pick(r.workflowName), value: 0 };
      cur.value += 1;
      m.set(r.workflowId, cur);
    }
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 6);
  }, [allRuns, pick]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <div className="space-y-5"><Skeleton className="h-10 w-48" /><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  const fmtDate = (s: string) => new Date(s).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  return (
    <div className="space-y-6">
      <SectionHead eyebrow={new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })} title={t('ad_nav_dashboard')} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('ad_kpi_workspaces')} value={data.workspaces} hint={`${data.activeWorkspaces} active`} icon="building" />
        <Stat label={t('ad_kpi_runs')} value={data.runs} hint={`${data.creditsUsed} credits`} icon="bolt" />
        <Stat label={t('ad_kpi_leads')} value={data.leads} icon="inbox" />
        <Stat label={t('ad_kpi_hours')} value={data.hoursSaved} icon="hours" />
        <Stat label={t('ad_kpi_rating')} value={data.avgRating ?? '—'} icon="star" />
        <Stat label={t('ad_kpi_cost')} value={`$${data.costUsd.toFixed(2)}`} hint={data.provider.isDemo ? t('demo_mode') : data.provider.model} icon="dollar" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-jade-12">{t('ad_chart_runs')}</h2>
            <Badge tone="neutral">{t('ad_last_14d')}</Badge>
          </div>
          <div className="mt-4"><ColumnChart data={byDay} title={t('ad_chart_runs')} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-jade-12">{t('ad_chart_popular')}</h2>
          <div className="mt-4">{popular.length ? <BarList data={popular} /> : <p className="text-sm text-sand-9">{t('ad_no_runs')}</p>}</div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="bolt" size={16} className="text-jade-9" /> {t('ad_recent_runs')}</h2>
          {data.recentRuns.length === 0 ? <p className="mt-3 text-sm text-sand-9">{t('ad_no_runs')}</p> : (
            <ul className="mt-3 divide-y divide-sand-4">
              {data.recentRuns.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sand-12">{pick(r.workflowName)} <span className="font-normal text-sand-9">· {r.visitorName || t('ad_visitor')}</span></p>
                    <p className="text-[12px] text-sand-9 tnum">{fmtDate(r.startedAt)} · <Link className="font-medium text-jade-10 hover:underline" to={`/admin/workspaces/${r.workspaceId}`}>{r.workspaceId}</Link></p>
                  </div>
                  {r.status === 'error' ? <Badge tone="danger">error</Badge> : r.rating ? <Stars value={r.rating} size="sm" /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-jade-12"><Icon name="inbox" size={16} className="text-jade-9" /> {t('ad_recent_leads')}</h2>
          {data.recentLeads.length === 0 ? <p className="mt-3 text-sm text-sand-9">{t('ad_no_leads')}</p> : (
            <ul className="mt-3 divide-y divide-sand-4">
              {data.recentLeads.map((l) => (
                <li key={l.id} className="py-2.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-sand-12"><Badge tone="brand">{l.type}</Badge> {l.name || '—'} <span className="font-normal text-sand-9">{l.email}</span></p>
                  <p className="mt-1 line-clamp-2 text-sand-10">{l.message}</p>
                  <p className="text-[12px] text-sand-9 tnum">{fmtDate(l.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
