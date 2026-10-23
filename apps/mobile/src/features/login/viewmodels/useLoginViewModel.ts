import { useRouter } from 'expo-router';
import type { SocialProvider } from '@ta-em-dia/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { loginFlow } from '../../../core/auth/accountFlow';
import { useAccountFlow } from '../../../core/auth/useAccountFlow';
import { useLogin } from '../LoginProvider';

const TOAST_MS = 2500;

const MESSAGES = {
  unavailable: 'Esse login ainda não está disponível neste aparelho.',
  retry: 'Sem conexão com o servidor. Tente de novo em instantes.',
  rejected: 'Não foi possível entrar. Tente de novo.',
  error: 'Não foi possível entrar. Tente de novo.',
} as const;

/** ViewModel: botões por plataforma, entrar com Google ou Apple e saída sem login. */
export function useLoginViewModel() {
  const { continueWithoutLogin, completeSocialLogin } = useLogin();
  const flow = useAccountFlow();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const signIn = useCallback(
    async (provider: SocialProvider) => {
      if (busy) return;
      setBusy(true);
      try {
        const result = await loginFlow(flow, provider);
        if (result.status === 'done') {
          await completeSocialLogin(provider);
          // Conta que já tem veículo (outro celular) não precisa cadastrar o primeiro de novo.
          router.replace(result.hasVehicles ? '/permissao-notificacoes' : '/primeiro-veiculo');
        } else if (result.status !== 'cancelled') {
          showToast(MESSAGES[result.status]);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, completeSocialLogin, flow, router, showToast],
  );

  const skip = useCallback(async () => {
    setBusy(true);
    try {
      await continueWithoutLogin();
      router.push('/aviso-sem-login');
    } finally {
      setBusy(false);
    }
  }, [continueWithoutLogin, router]);

  return {
    showApple: Platform.OS === 'ios',
    toast,
    busy,
    onGoogle: () => signIn('google'),
    onApple: () => signIn('apple'),
    skip,
  };
}
