import { Link } from 'react-router-dom';
import { useLang } from '@/i18n';

export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Your Company';
export const BRAND_TAGLINE = { vi: import.meta.env.VITE_BRAND_TAGLINE_VI || 'Học AI. Xây AI. Đo kết quả.', en: import.meta.env.VITE_BRAND_TAGLINE_EN || 'Learn it. Build it. Measure it.' };
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@example.com';

export function Logo({ to = '/', subtitle }: { to?: string; subtitle?: string }) {
  const { t } = useLang();
  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true"><path d="M9 22l7-13 7 13H9z" fill="currentColor" /></svg>
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-ink-900 group-hover:text-brand-800">{BRAND_NAME}</span>
        <span className="block text-xs text-ink-500">{subtitle ?? t('brand_sandbox')}</span>
      </span>
    </Link>
  );
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-lg border border-ink-300 bg-white p-0.5 text-xs font-medium" role="group" aria-label="Language">
      {(['vi', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-md px-2.5 py-1 transition ${lang === l ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
