import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureInstallationCredentials } from '../../core/auth';
import { useDb } from '../../core/db';
import { isLoginDone, markLoginDone } from './models/login.repository';

interface LoginState {
  /** `null` enquanto lê o SQLite. */
  done: boolean | null;
  /** Cria as credenciais do aparelho, marca o login como feito e libera o app. */
  continueWithoutLogin: () => Promise<void>;
}

const LoginContext = createContext<LoginState | null>(null);

/** Lê do SQLite se o Login já foi feito e deixa a tela concluí-lo (só o modo sem login, por enquanto). */
export function LoginProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isLoginDone(db).then((value) => {
      if (active) setDone(value);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const continueWithoutLogin = useCallback(async () => {
    await ensureInstallationCredentials();
    await markLoginDone(db, 'anonymous');
    setDone(true);
  }, [db]);

  const value = useMemo(() => ({ done, continueWithoutLogin }), [done, continueWithoutLogin]);
  return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
}

export function useLogin(): LoginState {
  const ctx = useContext(LoginContext);
  if (!ctx) throw new Error('useLogin fora do LoginProvider');
  return ctx;
}
