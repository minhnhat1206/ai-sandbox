import { createContext, useContext } from 'react';
import type { SandboxView } from '@shared/types';

export interface SandboxCtx {
  token: string;
  view: SandboxView;
  /** Update the remaining credits shown in the header after a run. */
  setCredits: (n: number) => void;
  refresh: () => Promise<void>;
}

export const SandboxContext = createContext<SandboxCtx | null>(null);

export function useSandbox(): SandboxCtx {
  const v = useContext(SandboxContext);
  if (!v) throw new Error('useSandbox outside SandboxLayout');
  return v;
}
