import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND_NAME, BRAND_TAGLINE, LangToggle, Logo } from '@/components/Logo';
import { HeroPreview, StepArt } from '@/components/illustrations';
import { Button } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';

export default function Landing() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toLowerCase().replace(/^.*\/s\//, '');
    if (c) nav(`/s/${encodeURIComponent(c)}`);
  };
  const steps = [
    { t: t('landing_step1_t'), d: t('landing_step1_d') },
    { t: t('landing_step2_t'), d: t('landing_step2_d') },
    { t: t('landing_step3_t'), d: t('landing_step3_d') },
  ];
  const trust = [
    { icon: 'lock', text: t('landing_trust_1') },
    { icon: 'coins', text: t('landing_trust_2') },
    { icon: 'docCheck', text: t('landing_trust_3') },
  ];
  return (
    <div className="min-h-screen">
      {/* ---------------------------------------------------------- hero */}
      <section className="grain relative overflow-hidden bg-ink-900 text-white">
        <div className="pointer-events-none absolute inset-0 dotfield-dark opacity-60" />
        <div className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] rounded-full bg-jade-8/25 blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-9/15 blur-[120px]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo tone="light" subtitle={BRAND_TAGLINE[lang]} />
          <div className="flex items-center gap-3">
            <Link to="/admin" className="hidden items-center gap-1.5 text-xs text-white/60 transition hover:text-white sm:inline-flex"><Icon name="lock" size={13} /> {t('landing_admin')}</Link>
            <LangToggle tone="dark" />
          </div>
        </header>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_1fr] md:items-center md:pb-28 md:pt-14">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-jade-4 ring-1 ring-white/12 animate-rise">
              <Icon name="sparkle" size={14} className="text-amber-6" /> {t('no_account_needed')}
            </p>
            <h1 className="display text-[40px] font-extrabold text-white animate-rise delay-1 md:text-[58px]">{t('landing_title')}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/70 animate-rise delay-2">{t('landing_sub')}</p>
            <form onSubmit={submit} className="mt-8 flex max-w-lg flex-col gap-2 animate-rise delay-3 sm:flex-row">
              <label htmlFor="code" className="sr-only">{t('landing_enter_code')}</label>
              <div className="relative flex-1">
                <Icon name="bolt" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('landing_code_placeholder')} className="h-12 w-full rounded-xl bg-white/10 pl-10 pr-3 text-[15px] text-white placeholder:text-white/40 ring-1 ring-white/15 backdrop-blur transition focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-jade-6" />
              </div>
              <Button type="submit" size="lg" className="shrink-0">{t('landing_open')} <Icon name="arrowRight" size={17} /></Button>
            </form>
            <p className="mt-4 text-sm text-white/60 animate-rise delay-4">
              <Link to="/s/demo" className="group inline-flex items-center gap-1 font-semibold text-jade-4 transition hover:text-white">{t('landing_try_demo')} <Icon name="arrowRight" size={14} className="transition group-hover:translate-x-0.5" /></Link>
            </p>
          </div>
          <div className="animate-rise delay-2">
            <HeroPreview className="w-full drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="-mt-10 relative z-10">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <article key={i} className="hover-lift rounded-xl2 bg-white p-6 hairline shadow-[var(--shadow-card)] animate-rise delay-2">
                <div className="flex items-center justify-between">
                  <StepArt step={(i + 1) as 1 | 2 | 3} className="h-16 w-16 text-jade-9" />
                  <span className="font-mono text-[11px] font-semibold text-sand-8">0{i + 1}</span>
                </div>
                <h2 className="mt-4 text-[17px] font-bold tracking-tight text-jade-12">{s.t}</h2>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-sand-10">{s.d}</p>
              </article>
            ))}
          </div>
          <p className="eyebrow mt-4 text-center">{t('landing_how')}</p>
        </section>

        <section className="mt-16 grid gap-3 md:grid-cols-3">
          {trust.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-white/70 p-4 text-[14px] text-sand-11 hairline">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-jade-3 text-jade-10"><Icon name={s.icon} size={16} /></span>
              <span className="pt-1">{s.text}</span>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-sand-4 py-8 text-center text-xs text-sand-9">© {new Date().getFullYear()} {BRAND_NAME} · {BRAND_TAGLINE[lang]}</footer>
    </div>
  );
}
