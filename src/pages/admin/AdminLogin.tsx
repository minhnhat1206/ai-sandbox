import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LangToggle, Logo } from '@/components/Brand';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex items-center justify-between"><Logo /><LangToggle /></div>
      <Card className="p-6">
        <h1 className="text-xl font-bold">{t('ad_login_title')}</h1>
        <p className="mt-1 text-sm text-ink-700">{t('ad_login_sub')}</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="ADMIN_TOKEN" htmlFor="tok"><Input id="tok" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus /></Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={busy}>{t('ad_login_btn')}</Button>
        </form>
      </Card>
    </div>
  );
}
