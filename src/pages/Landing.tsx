import { ArrowRight, Lock, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND_NAME, BRAND_TAGLINE, LangToggle, Logo } from '@/components/Brand';
import { Button, Card, Input } from '@/components/ui';
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
    { icon: <Sparkles className="h-5 w-5" />, t: t('landing_step1_t'), d: t('landing_step1_d') },
    { icon: <Timer className="h-5 w-5" />, t: t('landing_step2_t'), d: t('landing_step2_d') },
    { icon: <ShieldCheck className="h-5 w-5" />, t: t('landing_step3_t'), d: t('landing_step3_d') },
  ];
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo subtitle={BRAND_TAGLINE[lang]} />
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-xs text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t('landing_admin')}</Link>
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid gap-10 py-10 md:grid-cols-2 md:items-center md:py-16">
          <div className="animate-rise">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Sparkles className="h-3.5 w-3.5" /> {t('no_account_needed')}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-5xl">{t('landing_title')}</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-700">{t('landing_sub')}</p>
            <form onSubmit={submit} className="mt-8 flex max-w-md flex-col gap-2 sm:flex-row">
              <label htmlFor="code" className="sr-only">{t('landing_enter_code')}</label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('landing_code_placeholder')} className="sm:flex-1" />
              <Button type="submit" size="lg">{t('landing_open')} <ArrowRight className="h-4 w-4" /></Button>
            </form>
            <p className="mt-3 text-sm text-ink-500">
              <Link to="/s/demo" className="font-medium text-brand-700 underline-offset-2 hover:underline">{t('landing_try_demo')} →</Link>
            </p>
          </div>
          <Card className="p-6 md:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{t('landing_how')}</h2>
            <ol className="mt-4 space-y-5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{s.icon}</span>
                  <div>
                    <p className="font-semibold text-ink-900">{i + 1}. {s.t}</p>
                    <p className="text-sm text-ink-700">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[t('landing_trust_1'), t('landing_trust_2'), t('landing_trust_3')].map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /> {s}
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-ink-100 py-6 text-center text-xs text-ink-500">© {new Date().getFullYear()} {BRAND_NAME} · {BRAND_TAGLINE[lang]}</footer>
    </div>
  );
}
