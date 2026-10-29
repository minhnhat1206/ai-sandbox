import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import type { SandboxView } from '@shared/types';
import { BRAND_NAME, LangToggle, Logo } from '@/components/Logo';
import { Ring } from '@/components/illustrations';
import { Alert, Button, Skeleton } from '@/components/ui';
import { Icon } from '@/icons';
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
      <div className="mx-auto max-w-md px-5 py-20">
        <Logo />
        <div className="mt-8"><Alert tone="error">{error.code === 'expired' ? t('sb_expired') : t('sb_not_found')}</Alert></div>
        <Link to="/" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-jade-10 hover:underline"><Icon name="arrowLeft" size={15} /> {t('back')}</Link>
      </div>
    );
  }
  if (!view || !ctx) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      </div>
    );
  }

  const tabs = [
    { to: `/s/${token}`, end: true, icon: 'grid', label: t('sb_nav_workflows') },
    { to: `/s/${token}/results`, icon: 'docCheck', label: t('sb_nav_results') },
    { to: `/s/${token}/contact`, icon: 'handshake', label: t('sb_nav_contact') },
  ];
  const low = view.creditsRemaining <= Math.max(3, Math.round(view.creditsTotal * 0.1));

  return (
    <SandboxContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-sand-4/80 bg-sand-2/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
            <Logo to={`/s/${token}`} subtitle={view.workspace.company} />
            <nav className="hidden items-center gap-1 rounded-full bg-sand-3/80 p-1 md:flex" aria-label="Sandbox">
              {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${isActive ? 'bg-white text-jade-12 shadow-[0_1px_2px_rgb(27_24_20/.08)]' : 'text-sand-10 hover:text-sand-12'}`}>
                  <Icon name={tab.icon} size={15} /> {tab.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2.5">
              <div className={`hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] font-semibold sm:flex ${low ? 'bg-amber-3 text-amber-11' : 'bg-jade-3 text-jade-11'}`} title={t('sb_credits')}>
                <Ring value={view.creditsRemaining} max={view.creditsTotal} size={24} stroke={3} />
                <span className="tnum">{view.creditsRemaining}/{view.creditsTotal}</span>
                <span className="font-medium opacity-80">{t('sb_credits')}</span>
              </div>
              <LangToggle />
            </div>
          </div>
          <nav className="flex border-t border-sand-4 bg-white md:hidden" aria-label="Sandbox mobile">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold ${isActive ? 'border-b-2 border-jade-9 text-jade-11' : 'text-sand-9'}`}>
                <Icon name={tab.icon} size={15} /> {tab.label}
              </NavLink>
            ))}
          </nav>
        </header>
        {view.provider.isDemo && (
          <div className="flex items-center justify-center gap-2 bg-amber-3 px-4 py-1.5 text-center text-[12px] text-amber-11">
            <Icon name="info" size={14} /> <strong>{t('demo_mode')}:</strong> {t('demo_mode_hint')}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7">
          {view.budgetExhausted ? (
            <div className="grain relative mb-6 overflow-hidden rounded-xl2 bg-ink-900 p-5 text-white animate-rise">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-9/30 blur-3xl" />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[15px] font-bold"><Icon name="flag" size={16} className="text-amber-6" /> {t('sb_budget_out_title')}</p>
                  <p className="mt-1 max-w-2xl text-[13.5px] text-white/70">{t('sb_budget_out')}</p>
                </div>
                <Link to={`/s/${token}/contact?type=book_call`}><Button icon="calendarCheck" className="shrink-0">{t('run_cta_btn')}</Button></Link>
              </div>
            </div>
          ) : view.creditsRemaining <= 0 ? <div className="mb-5"><Alert tone="warn">{t('sb_credits_out')}</Alert></div> : null}
          <Outlet />
        </main>
        <footer className="border-t border-sand-4 py-5 text-center text-[12px] text-sand-9">
          {t('powered_by')} <strong className="text-sand-11">{BRAND_NAME}</strong> · {t('no_account_needed')}
        </footer>
      </div>
    </SandboxContext.Provider>
  );
}
