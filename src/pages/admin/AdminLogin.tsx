import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LangToggle, Logo, Mark } from '@/components/Logo';
import { Alert, Button, Field, Input } from '@/components/ui';
import { Icon } from '@/icons';
import { useLang } from '@/i18n';
import { adminApi, setAdminToken } from '@/lib/api';

export default function AdminLogin() {
  const { t } = useLang();
  const nav = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(token);
      setAdminToken(token);
      nav('/admin');
    } catch {
      setError(t('ad_login_bad'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-5">
      <div className="pointer-events-none absolute inset-0 dotfield-dark opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jade-8/25 blur-[140px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between"><Logo tone="light" /><LangToggle tone="dark" /></div>
        <div className="rounded-xl3 bg-white p-7 shadow-[var(--shadow-lift)] animate-pop">
          <Mark size={44} />
          <h1 className="display mt-4 text-[24px] font-bold text-jade-12">{t('ad_login_title')}</h1>
          <p className="mt-1.5 text-[14px] text-sand-10">{t('ad_login_sub')}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="ADMIN_TOKEN" htmlFor="tok"><Input id="tok" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus /></Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" loading={busy} icon="lock">{t('ad_login_btn')}</Button>
          </form>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-white/50"><Icon name="shield" size={13} /> {t('landing_trust_1')}</p>
      </div>
    </div>
  );
}
