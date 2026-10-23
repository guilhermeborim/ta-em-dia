import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureInstallationCredentials, onSignedOut } from '../../core/auth';
import { useDb } from '../../core/db';
import { isLoginDone, markLoginDone, resetLogin, type LoginMode } from './models/login.repository';

interface LoginState {
  /** `null` enquanto lê o SQLite. */
  done: boolean | null;
  /** Cria as credenciais do aparelho, marca o login como feito e libera o app. */
  continueWithoutLogin: () => Promise<void>;
  /** Marca o login como feito depois de entrar com Google ou Apple (a sessão já está guardada). */
  completeSocialLogin: (mode: Exclude<LoginMode, 'anonymous'>) => Promise<void>;
}

const LoginContext = createContext<LoginState | null>(null);

/** Lê do SQLite se o Login já foi feito e deixa a tela concluí-lo (sem login ou com Google/Apple) e volta atrás quando a pessoa sai da conta. */
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

  const completeSocialLogin = useCallback(
    async (mode: Exclude<LoginMode, 'anonymous'>) => {
      await markLoginDone(db, mode);
      setDone(true);
    },
    [db],
  );

  // "Sair da conta" apagou os dados e a sessão: o Login volta a aparecer.
  useEffect(
    () =>
      onSignedOut(() => {
        void resetLogin(db).then(() => setDone(false));
      }),
    [db],
  );

  const value = useMemo(
    () => ({ done, continueWithoutLogin, completeSocialLogin }),
    [done, continueWithoutLogin, completeSocialLogin],
  );
  return <LoginContext.Provider value={value}>{children}</LoginContext.Provider>;
}

export function useLogin(): LoginState {
  const ctx = useContext(LoginContext);
  if (!ctx) throw new Error('useLogin fora do LoginProvider');
  return ctx;
}
