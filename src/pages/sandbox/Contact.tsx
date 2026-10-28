import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LeadType } from '@shared/types';
import { Alert, Button, Field, Input, SectionHead, Textarea } from '@/components/ui';
import { Icon } from '@/icons';
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

  const types: { id: LeadType; icon: string; label: string }[] = [
    { id: 'book_call', icon: 'calendarCheck', label: t('ct_type_call') },
    { id: 'request_workflow', icon: 'Wand2', label: t('ct_type_request') },
    { id: 'feedback', icon: 'thumbsUp', label: t('ct_type_feedback') },
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
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHead eyebrow={view.workspace.company} title={t('ct_title')} sub={t('ct_sub')} />
      {sent ? (
        <div className="rounded-xl3 bg-white p-10 text-center hairline shadow-[var(--shadow-card)] animate-pop">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-jade-3 text-jade-10"><Icon name="checkCircle" size={34} strokeWidth={1.5} /></span>
          <p className="mt-4 text-[17px] font-bold text-jade-12">{t('ct_sent')}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 rounded-xl3 bg-white p-6 hairline shadow-[var(--shadow-card)] animate-rise">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {types.map((ty) => {
              const active = type === ty.id;
              return (
                <button type="button" key={ty.id} role="radio" aria-checked={active} onClick={() => setType(ty.id)} className={`flex flex-col items-start gap-2 rounded-xl p-3.5 text-left text-[13.5px] font-semibold transition ${active ? 'bg-jade-12 text-white shadow-[0_8px_20px_-10px_rgb(11_47_39/.7)]' : 'bg-sand-2 text-sand-11 hover:bg-sand-3'}`}>
                  <Icon name={ty.icon} size={20} className={active ? 'text-amber-6' : 'text-jade-9'} /> {ty.label}
                </button>
              );
            })}
          </div>
          <Field label={t('ct_name')} htmlFor="ct-name"><Input id="ct-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t('ct_email')} htmlFor="ct-email" required><Input id="ct-email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t('ct_message')} htmlFor="ct-msg">
            <Textarea id="ct-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={type === 'request_workflow' ? t('ct_message_request_ph') : t('ct_message_call_ph')} />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" loading={busy} icon="send" className="w-full sm:w-auto">{t('send')}</Button>
        </form>
      )}
    </div>
  );
}
