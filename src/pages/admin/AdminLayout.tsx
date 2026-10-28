import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LangToggle, Logo } from '@/components/Logo';
import { Alert } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi, getAdminToken, setAdminToken } from '@/lib/api';

export default function AdminLayout() {
  const { t } = useLang();
  const nav = useNavigate();
  const [health, setHealth] = useState<{ provider: { name: string; model: string; isDemo: boolean }; adminTokenIsDefault: boolean } | null>(null);
  const token = getAdminToken();
  useEffect(() => { adminApi.health().then(setHealth).catch(() => undefined); }, []);
  if (!token) return <Navigate to="/admin/login" replace />;

  const links = [
    { to: '/admin', end: true, icon: 'dashboard', label: t('ad_nav_dashboard') },
    { to: '/admin/workspaces', icon: 'building', label: t('ad_nav_workspaces') },
    { to: '/admin/catalog', icon: 'library', label: t('ad_nav_catalog') },
  ];
  const linkCls = ({ isActive }: { isActive: boolean }) => `inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${isActive ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/.08)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`;
  return (
    <div className="min-h-screen md:flex">
      <aside className="grain relative bg-ink-900 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="pointer-events-none absolute inset-0 dotfield-dark opacity-30" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between p-5 md:block">
            <Logo to="/admin" subtitle="Admin console" tone="light" />
            <div className="md:hidden"><LangToggle tone="dark" /></div>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3" aria-label="Admin">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {({ isActive }) => (<><Icon name={l.icon} size={17} className={isActive ? 'text-amber-6' : ''} /> {l.label}</>)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden space-y-4 border-t border-white/10 p-5 md:block">
            {health && (
              <div className="rounded-xl bg-white/5 p-3 text-[12px] ring-1 ring-white/10">
                <p className="eyebrow text-jade-5">{t('ad_provider')}</p>
                <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                  <span className={`h-2 w-2 rounded-full ${health.provider.isDemo ? 'bg-amber-6' : 'bg-jade-6'}`} />
                  {health.provider.name} <span className="font-mono text-[11px] text-white/50">{health.provider.model}</span>
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <LangToggle tone="dark" />
              <button onClick={() => { setAdminToken(''); nav('/admin/login'); }} className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition hover:text-white"><Icon name="logout" size={15} /> {t('ad_logout')}</button>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 md:px-10">
        {health?.adminTokenIsDefault && <div className="mb-5"><Alert tone="warn">{t('ad_default_token_warning')}</Alert></div>}
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>
    </div>
  );
}
