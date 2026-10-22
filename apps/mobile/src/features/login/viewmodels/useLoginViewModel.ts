import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useLogin } from '../LoginProvider';

const TOAST_MS = 2500;

/** ViewModel: botões por plataforma, aviso "Em breve" e saída sem login. */
export function useLoginViewModel() {
  const { continueWithoutLogin } = useLogin();
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

  const comingSoon = useCallback(() => {
    setToast('Em breve');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

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
    onGoogle: comingSoon,
    onApple: comingSoon,
    skip,
  };
}
