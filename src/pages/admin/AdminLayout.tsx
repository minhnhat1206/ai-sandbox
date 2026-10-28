import { Building2, LayoutDashboard, Library, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LangToggle, Logo } from '@/components/Brand';
import { Alert, Badge } from '@/components/ui';
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
    { to: '/admin', end: true, icon: <LayoutDashboard className="h-4 w-4" />, label: t('ad_nav_dashboard') },
    { to: '/admin/workspaces', icon: <Building2 className="h-4 w-4" />, label: t('ad_nav_workspaces') },
    { to: '/admin/catalog', icon: <Library className="h-4 w-4" />, label: t('ad_nav_catalog') },
  ];
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-ink-100 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <Logo to="/admin" subtitle="Admin" />
          <div className="md:hidden"><LangToggle /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3" aria-label="Admin">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-100'}`}>{l.icon} {l.label}</NavLink>
          ))}
        </nav>
        <div className="hidden md:block px-4 py-3 space-y-3 border-t border-ink-100">
          {health && (
            <p className="text-xs text-ink-500">{t('ad_provider')}: <Badge tone={health.provider.isDemo ? 'warn' : 'success'}>{health.provider.name} · {health.provider.model}</Badge></p>
          )}
          <LangToggle />
          <button onClick={() => { setAdminToken(''); nav('/admin/login'); }} className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"><LogOut className="h-4 w-4" /> {t('ad_logout')}</button>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 max-w-6xl">
        {health?.adminTokenIsDefault && <div className="mb-4"><Alert tone="warn">{t('ad_default_token_warning')}</Alert></div>}
        <Outlet />
      </main>
    </div>
  );
}
