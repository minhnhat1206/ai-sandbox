import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from '@/icons';

/* ------------------------------------------------------------------ Button */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'soft';
const VARIANTS: Record<Variant, string> = {
  primary: 'text-white bg-[linear-gradient(180deg,#1C8C72,#137A62)] shadow-[inset_0_1px_0_rgb(255_255_255/.18),0_1px_2px_rgb(11_47_39/.25),0_8px_20px_-10px_rgb(19_122_98/.6)] hover:brightness-[1.06]',
  secondary: 'bg-white text-sand-12 hairline-strong hover:bg-sand-1 shadow-[0_1px_2px_rgb(27_24_20/.04)]',
  soft: 'bg-jade-3 text-jade-11 hover:bg-jade-4',
  ghost: 'text-sand-11 hover:bg-sand-3 hover:text-sand-12',
  danger: 'bg-coral-9 text-white hover:brightness-110',
  dark: 'bg-jade-12 text-white hover:bg-ink-800 shadow-[0_8px_20px_-10px_rgb(11_47_39/.7)]',
};
export function Button({ variant = 'primary', loading, className = '', children, size = 'md', icon, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' | 'lg'; icon?: string }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-[13px] gap-1.5' : size === 'lg' ? 'h-12 px-6 text-[15px] gap-2' : 'h-10 px-4 text-sm gap-2';
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`press inline-flex items-center justify-center rounded-xl font-semibold tracking-[-0.005em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 ${sz} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Icon name="loader" size={16} /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */
export function Card({ className = '', children, as: Tag = 'div', lift }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article'; lift?: boolean }) {
  return <Tag className={`rounded-xl2 bg-white hairline shadow-[var(--shadow-card)] ${lift ? 'hover-lift' : ''} ${className}`}>{children}</Tag>;
}

/* ------------------------------------------------------------------- Badge */
export function Badge({ children, tone = 'neutral', className = '', dot }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'warn' | 'success' | 'danger' | 'info' | 'dark'; className?: string; dot?: boolean }) {
  const tones = {
    neutral: 'bg-sand-3 text-sand-11',
    brand: 'bg-jade-3 text-jade-11',
    warn: 'bg-amber-3 text-amber-11',
    success: 'bg-jade-3 text-jade-11',
    danger: 'bg-coral-3 text-coral-11',
    info: 'bg-sky-3 text-sky-11',
    dark: 'bg-jade-12 text-white',
  };
  const dots = { neutral: 'bg-sand-8', brand: 'bg-jade-8', warn: 'bg-amber-9', success: 'bg-jade-8', danger: 'bg-coral-9', info: 'bg-sky-9', dark: 'bg-amber-6' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${tones[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Fields */
const fieldCls = 'w-full rounded-xl bg-white px-3.5 py-2.5 text-[14px] text-sand-12 hairline placeholder:text-sand-8 transition focus:outline-none focus:ring-[3px] focus:ring-jade-4 focus:[box-shadow:inset_0_0_0_1px_var(--color-jade-8)] disabled:bg-sand-2 disabled:text-sand-10';
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} leading-relaxed ${props.className ?? ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${fieldCls} appearance-none pr-9 ${props.className ?? ''}`} />
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sand-9" />
    </div>
  );
}
export function Field({ label, help, error, required, children, htmlFor }: { label: string; help?: string; error?: string; required?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-[13px] font-semibold text-sand-12">
        {label} {required && <span className="text-coral-9" aria-hidden="true">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-sand-9">{help}</p>}
      {error && <p className="flex items-center gap-1 text-xs font-medium text-coral-11" role="alert"><Icon name="alert" size={13} /> {error}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- Feedback */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-sand-9" role="status">
      <Icon name="loader" size={16} /> {label}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} aria-hidden="true" />;
}

export function EmptyState({ art, title, children }: { art?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl2 border border-dashed border-sand-6 bg-sand-1 p-10 text-center">
      {art && <div className="mx-auto mb-4 w-28 text-sand-8">{art}</div>}
      <p className="font-semibold text-sand-11">{title}</p>
      {children && <div className="mt-2 text-sm text-sand-9">{children}</div>}
    </div>
  );
}

export function Alert({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode; icon?: string }) {
  const tones = {
    info: 'bg-sky-3 text-sky-11',
    warn: 'bg-amber-3 text-amber-11',
    error: 'bg-coral-3 text-coral-11',
    success: 'bg-jade-3 text-jade-11',
  };
  const icons = { info: 'info', warn: 'alert', error: 'alert', success: 'checkCircle' };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon name={icon ?? icons[tone]} size={17} className="mt-0.5" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, children, wide, eyebrow }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; eyebrow?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-jade-12/55 p-3 backdrop-blur-[3px] animate-fade sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-xl3 bg-white shadow-[var(--shadow-lift)] animate-pop`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 className="text-lg font-bold tracking-tight text-jade-12">{title}</h2>
          </div>
          <button onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-sand-9 transition hover:bg-sand-3 hover:text-sand-12" aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Tabs */
export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: { tabs: { id: T; label: string; icon?: string; count?: number }[]; value: T; onChange: (t: T) => void; className?: string }) {
  return (
    <div className={`no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-sand-3 p-1 ${className}`} role="tablist">
      {tabs.map((tb) => {
        const active = value === tb.id;
        return (
          <button key={tb.id} role="tab" aria-selected={active} onClick={() => onChange(tb.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${active ? 'bg-white text-jade-12 shadow-[0_1px_2px_rgb(27_24_20/.08)]' : 'text-sand-10 hover:text-sand-12'}`}>
            {tb.icon && <Icon name={tb.icon} size={15} className={active ? 'text-jade-9' : ''} />}
            {tb.label}
            {tb.count !== undefined && <span className={`rounded-full px-1.5 text-[10.5px] tnum ${active ? 'bg-jade-3 text-jade-11' : 'bg-sand-4 text-sand-10'}`}>{tb.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Stat tile */
export function Stat({ label, value, hint, icon, trend }: { label: string; value: ReactNode; hint?: string; icon?: string; trend?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-sand-9">{label}</p>
        {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-jade-3 text-jade-10"><Icon name={icon} size={15} /></span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-[26px] font-bold leading-none tracking-tight text-jade-12 tnum">{value}</p>
        {trend}
      </div>
      {hint && <p className="mt-2 text-xs text-sand-9">{hint}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------- Stars */
export function Stars({ value, onChange, size = 'md' }: { value?: number; onChange?: (n: 1 | 2 | 3 | 4 | 5) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState<number | null>(null);
  const px = size === 'sm' ? 15 : 26;
  const shown = hover ?? value ?? 0;
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="rating" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n as 1 | 2 | 3 | 4 | 5)}
          onMouseEnter={() => onChange && setHover(n)}
          aria-label={`${n}`}
          aria-checked={value === n}
          role={onChange ? 'radio' : undefined}
          className={`rounded-md transition ${n <= shown ? 'text-amber-9' : 'text-sand-6'} ${onChange ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}`}
        >
          <Icon name={n <= shown ? 'starFilled' : 'star'} size={px} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Toast */
interface ToastCtx { show: (message: string, icon?: string) => void }
const ToastContext = createContext<ToastCtx>({ show: () => undefined });
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; icon: string; id: number } | null>(null);
  const timer = useRef<number | null>(null);
  const show = useCallback((message: string, icon = 'check') => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ message, icon, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div key={toast.id} role="status" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-jade-12 px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-lift)] animate-pop">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-jade-8"><Icon name={toast.icon} size={13} /></span>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/* ----------------------------------------------------------- Section head */
export function SectionHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="display text-[26px] font-bold text-jade-12 md:text-[32px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-sand-10">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------ Icon tile */
export function IconTile({ name, size = 'md', tone = 'jade' }: { name: string; size?: 'sm' | 'md' | 'lg'; tone?: 'jade' | 'amber' | 'dark' }) {
  const dims = size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  const px = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const tones = {
    jade: 'bg-[linear-gradient(160deg,var(--color-jade-3),var(--color-jade-2))] text-jade-10 shadow-[inset_0_0_0_1px_rgb(19_122_98/.12)]',
    amber: 'bg-amber-3 text-amber-11',
    dark: 'bg-jade-12 text-jade-5',
  };
  return <span className={`flex shrink-0 items-center justify-center ${dims} ${tones[tone]}`}><Icon name={name} size={px} /></span>;
}
