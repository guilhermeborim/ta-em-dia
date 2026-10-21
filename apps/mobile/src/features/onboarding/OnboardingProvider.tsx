import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useDb } from '../../core/db';
import { isOnboardingDone, markOnboardingDone } from './models/onboarding.repository';

interface OnboardingState {
  /** `null` enquanto lê o SQLite. */
  done: boolean | null;
  complete: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

/** Lê do SQLite se as boas-vindas já foram vistas e deixa a tela concluí-las. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isOnboardingDone(db).then((value) => {
      if (active) setDone(value);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const complete = useCallback(async () => {
    await markOnboardingDone(db);
    setDone(true);
  }, [db]);

  const value = useMemo(() => ({ done, complete }), [done, complete]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding fora do OnboardingProvider');
  return ctx;
}
