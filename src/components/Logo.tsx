import { Link } from 'react-router-dom';
import { useLang } from '@/i18n';

export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Your Company';
export const BRAND_TAGLINE = { vi: import.meta.env.VITE_BRAND_TAGLINE_VI || 'Học AI. Xây AI. Đo kết quả.', en: import.meta.env.VITE_BRAND_TAGLINE_EN || 'Learn it. Build it. Measure it.' };
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@example.com';

/**
 * Brand mark: a sail (we carry the team forward) that is also a rising curve
 * (measured results), with a gold spark – the moment something clicks.
 */
export function Mark({ size = 36, tone = 'jade', className = '' }: { size?: number; tone?: 'jade' | 'light'; className?: string }) {
  const bg = tone === 'jade' ? 'url(#mk-g)' : 'rgba(255,255,255,.12)';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mk-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C8C72" />
          <stop offset="1" stopColor="#0B5A49" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={bg} />
      {tone === 'light' && <rect x=".5" y=".5" width="31" height="31" rx="8.5" stroke="rgba(255,255,255,.22)" fill="none" />}
      <path d="M9 23c0-9 6-14 14-15-1 8-5 14-14 15z" fill="#fff" fillOpacity=".96" />
      <path d="M9 23c3.5-4.5 7-8 11-11" stroke="#0B5A49" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="23" cy="8.5" r="2.2" fill="#F4C15D" />
    </svg>
  );
}

export function Logo({ to = '/', subtitle, tone = 'jade' }: { to?: string; subtitle?: string; tone?: 'jade' | 'light' }) {
  const { t } = useLang();
  const light = tone === 'light';
  return (
    <Link to={to} className="group flex items-center gap-2.5 rounded-lg">
      <Mark tone={tone} className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="leading-tight">
        <span className={`block text-[13.5px] font-bold tracking-tight ${light ? 'text-white' : 'text-jade-12'}`}>{BRAND_NAME}</span>
        <span className={`block text-[11.5px] ${light ? 'text-white/60' : 'text-sand-9'}`}>{subtitle ?? t('brand_sandbox')}</span>
      </span>
    </Link>
  );
}

export function LangToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { lang, setLang } = useLang();
  const dark = tone === 'dark';
  return (
    <div className={`inline-flex rounded-full p-0.5 text-[11px] font-semibold ${dark ? 'bg-white/10' : 'bg-sand-3 hairline'}`} role="group" aria-label="Language">
      {(['vi', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 transition ${lang === l ? (dark ? 'bg-white text-jade-12' : 'bg-jade-12 text-white shadow-sm') : dark ? 'text-white/70 hover:text-white' : 'text-sand-10 hover:text-sand-12'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
