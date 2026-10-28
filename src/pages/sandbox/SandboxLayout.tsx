import { Coins, FileCheck2, Handshake, LayoutGrid } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import type { SandboxView } from '@shared/types';
import { BRAND_NAME, LangToggle, Logo } from '@/components/Brand';
import { Alert, Badge, Spinner } from '@/components/ui';
import { useLang } from '@/i18n';
import { ApiError, sandboxApi } from '@/lib/api';
import { SandboxContext } from './context';

export default function SandboxLayout() {
  const { token = '' } = useParams();
  const { t, setLang } = useLang();
  const [view, setView] = useState<SandboxView | null>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const v = await sandboxApi.view(token);
      setView(v);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? { code: e.code, message: e.message } : { message: String(e) });
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  // Default the UI language to the workspace language on first load.
  useEffect(() => {
    if (view && !localStorage.getItem('sandbox.lang')) setLang(view.workspace.language);
  }, [view, setLang]);

  const ctx = useMemo(() => view && ({
    token,
    view,
    setCredits: (n: number) => setView((v) => (v ? { ...v, creditsRemaining: n } : v)),
    refresh: load,
  }), [token, view, load]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Logo />
        <div className="mt-6"><Alert tone="error">{error.code === 'expired' ? t('sb_expired') : t('sb_not_found')}</Alert></div>
        <Link to="/" className="mt-4 inline-block text-sm text-brand-700 hover:underline">← {t('back')}</Link>
      </div>
    );
  }
  if (!view || !ctx) return <div className="p-10"><Spinner label={t('loading')} /></div>;

  const tabs = [
    { to: `/s/${token}`, end: true, icon: <LayoutGrid className="h-4 w-4" />, label: t('sb_nav_workflows') },
    { to: `/s/${token}/results`, icon: <FileCheck2 className="h-4 w-4" />, label: t('sb_nav_results') },
    { to: `/s/${token}/contact`, icon: <Handshake className="h-4 w-4" />, label: t('sb_nav_contact') },
  ];
  const low = view.creditsRemaining <= Math.max(3, Math.round(view.creditsTotal * 0.1));

  return (
    <SandboxContext.Provider value={ctx}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Logo to={`/s/${token}`} subtitle={view.workspace.company} />
            <nav className="hidden md:flex items-center gap-1" aria-label="Sandbox">
              {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-100'}`}>
                  {tab.icon} {tab.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Badge tone={low ? 'warn' : 'brand'} className="hidden sm:inline-flex"><Coins className="h-3 w-3" /> {view.creditsRemaining}/{view.creditsTotal} {t('sb_credits')}</Badge>
              <LangToggle />
            </div>
          </div>
          <nav className="md:hidden flex border-t border-ink-100" aria-label="Sandbox mobile">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium ${isActive ? 'text-brand-800 border-b-2 border-brand-700' : 'text-ink-500'}`}>
                {tab.icon} {tab.label}
              </NavLink>
            ))}
          </nav>
        </header>
        {view.provider.isDemo && (
          <div className="bg-amber-50 text-amber-900 text-xs text-center px-4 py-1.5 border-b border-amber-200">
            <strong>{t('demo_mode')}:</strong> {t('demo_mode_hint')}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {view.creditsRemaining <= 0 && <div className="mb-4"><Alert tone="warn">{t('sb_credits_out')}</Alert></div>}
          <Outlet />
        </main>
        <footer className="border-t border-ink-100 bg-white py-4 text-center text-xs text-ink-500">
          {t('powered_by')} <strong>{BRAND_NAME}</strong> · {t('no_account_needed')}
        </footer>
      </div>
    </SandboxContext.Provider>
  );
}
