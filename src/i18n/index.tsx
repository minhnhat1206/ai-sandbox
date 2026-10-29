import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { L, Lang } from '@shared/types';
import { DICT, type DictKey } from './dict';

/** A dynamic key (e.g. `tool_${name}`) that may not exist in the dictionary. */
export type DictKeyLoose = string & { readonly __loose?: never };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a dictionary key with optional {placeholders}; unknown keys fall back to `fallback` (or the key). */
  t: (key: DictKey | DictKeyLoose, vars?: Record<string, string | number>, fallback?: string) => string;
  /** Pick the current language from a bilingual object. */
  pick: (l: L) => string;
}

const Ctx = createContext<LangCtx | null>(null);
const STORAGE_KEY = 'sandbox.lang';

function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') return stored;
  } catch { /* private mode */ }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? detect());
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);
  const value = useMemo<LangCtx>(() => ({
    lang,
    setLang,
    t: (key, vars, fallback) => {
      let s = (DICT as Record<string, L>)[key]?.[lang] ?? fallback ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    pick: (l) => l?.[lang] ?? l?.vi ?? '',
  }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside LangProvider');
  return v;
}
