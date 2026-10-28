import { CalendarCheck, MessageSquarePlus, ThumbsUp } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LeadType } from '@shared/types';
import { Alert, Button, Card, Field, Input, Textarea } from '@/components/ui';
import { useLang } from '@/i18n';
import { getVisitorName, sandboxApi } from '@/lib/api';
import { useSandbox } from './context';

export default function Contact() {
  const { t, pick } = useLang();
  const { token, view } = useSandbox();
  const [params] = useSearchParams();
  const initialType = (params.get('type') as LeadType) || 'book_call';
  const wfId = params.get('wf');
  const wfName = wfId ? view.workflows.find((w) => w.id === wfId)?.name : undefined;
  const [type, setType] = useState<LeadType>(['book_call', 'request_workflow', 'feedback'].includes(initialType) ? initialType : 'book_call');
  const [name, setName] = useState(getVisitorName());
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(wfName ? `${pick(wfName)}: ` : '');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const types: { id: LeadType; icon: React.ReactNode; label: string }[] = [
    { id: 'book_call', icon: <CalendarCheck className="h-4 w-4" />, label: t('ct_type_call') },
    { id: 'request_workflow', icon: <MessageSquarePlus className="h-4 w-4" />, label: t('ct_type_request') },
    { id: 'feedback', icon: <ThumbsUp className="h-4 w-4" />, label: t('ct_type_feedback') },
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sandboxApi.lead(token, { type, name, email, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('ct_title')}</h1>
        <p className="text-ink-700">{t('ct_sub')}</p>
      </header>
      {sent ? (
        <Alert tone="success">{t('ct_sent')}</Alert>
      ) : (
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {types.map((ty) => (
                <button type="button" key={ty.id} role="radio" aria-checked={type === ty.id} onClick={() => setType(ty.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${type === ty.id ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-ink-300 hover:bg-ink-50'}`}>
                  {ty.icon} {ty.label}
                </button>
              ))}
            </div>
            <Field label={t('ct_name')} htmlFor="ct-name"><Input id="ct-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={t('ct_email')} htmlFor="ct-email" required><Input id="ct-email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label={t('ct_message')} htmlFor="ct-msg">
              <Textarea id="ct-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={type === 'request_workflow' ? t('ct_message_request_ph') : t('ct_message_call_ph')} />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" size="lg" loading={busy}>{t('send')}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
