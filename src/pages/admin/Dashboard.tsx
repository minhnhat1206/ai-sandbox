import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminOverview } from '@shared/types';
import { Alert, Badge, Card, Spinner, Stars, Stat } from '@/components/ui';
import { useLang } from '@/i18n';
import { adminApi, ApiError, setAdminToken } from '@/lib/api';

export default function Dashboard() {
  const { t, pick, lang } = useLang();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.overview().then(setData).catch((e) => {
      if (e instanceof ApiError && e.status === 401) { setAdminToken(''); location.href = '/admin/login'; }
      else setError(String(e));
    });
  }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <Spinner label={t('loading')} />;
  const fmtDate = (s: string) => new Date(s).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('ad_nav_dashboard')}</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('ad_kpi_workspaces')} value={data.workspaces} hint={`${data.activeWorkspaces} active`} />
        <Stat label={t('ad_kpi_runs')} value={data.runs} hint={`${data.creditsUsed} credits`} />
        <Stat label={t('ad_kpi_leads')} value={data.leads} />
        <Stat label={t('ad_kpi_hours')} value={data.hoursSaved} />
        <Stat label={t('ad_kpi_rating')} value={data.avgRating ?? '—'} />
        <Stat label={t('ad_kpi_cost')} value={`$${data.costUsd.toFixed(2)}`} hint={data.provider.isDemo ? t('demo_mode') : data.provider.model} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">{t('ad_recent_runs')}</h2>
          {data.recentRuns.length === 0 ? <p className="mt-3 text-sm text-ink-500">{t('ad_no_runs')}</p> : (
            <ul className="mt-3 divide-y divide-ink-100">
              {data.recentRuns.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{pick(r.workflowName)} <span className="text-ink-500">· {r.visitorName || t('ad_visitor')}</span></p>
                    <p className="text-xs text-ink-500">{fmtDate(r.startedAt)} · <Link className="text-brand-700 hover:underline" to={`/admin/workspaces/${r.workspaceId}`}>{r.workspaceId}</Link></p>
                  </div>
                  {r.status === 'error' ? <Badge tone="danger">error</Badge> : r.rating ? <Stars value={r.rating} size="sm" /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">{t('ad_recent_leads')}</h2>
          {data.recentLeads.length === 0 ? <p className="mt-3 text-sm text-ink-500">{t('ad_no_leads')}</p> : (
            <ul className="mt-3 divide-y divide-ink-100">
              {data.recentLeads.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <p className="font-medium"><Badge tone="brand">{l.type}</Badge> {l.name || '—'} <span className="text-ink-500">{l.email}</span></p>
                  <p className="mt-0.5 line-clamp-2 text-ink-700">{l.message}</p>
                  <p className="text-xs text-ink-500">{fmtDate(l.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
