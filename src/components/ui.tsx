import { Loader2, X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-ink-900 border border-ink-300 hover:bg-ink-100',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', loading, className = '', children, size = 'md', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm';
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${sz} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={`rounded-2xl bg-white border border-ink-100 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)] ${className}`}>{children}</Tag>;
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'warn' | 'success' | 'danger'; className?: string }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-100 text-brand-800',
    warn: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
    danger: 'bg-red-100 text-red-800',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

const fieldCls = 'w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500/70 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} leading-relaxed ${props.className ?? ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
}

export function Field({ label, help, error, required, children, htmlFor }: { label: string; help?: string; error?: string; required?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-900">
        {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-ink-500">{help}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-500 text-sm" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 p-8 text-center text-ink-500">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-700">{icon}</div>}
      <p className="font-medium text-ink-700">{title}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'bg-brand-50 border-brand-200 text-brand-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white shadow-xl animate-rise max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-500 hover:bg-ink-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}

export function Stars({ value, onChange, size = 'md' }: { value?: number; onChange?: (n: 1 | 2 | 3 | 4 | 5) => void; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'text-base' : 'text-2xl';
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n as 1 | 2 | 3 | 4 | 5)}
          aria-label={`${n}`}
          aria-checked={value === n}
          role={onChange ? 'radio' : undefined}
          className={`${cls} leading-none transition ${n <= (value ?? 0) ? 'text-amber-400' : 'text-ink-300'} ${onChange ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
