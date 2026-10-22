import { useRouter } from 'expo-router';
import { appEnv } from '../../../core/env/appEnv';

/** ViewModel da aba Mais: por enquanto só os atalhos de desenvolvimento (fora de produção). */
export function useMoreViewModel() {
  const router = useRouter();
  const isDev = appEnv !== 'production';

  return {
    showDevTools: isDev,
    openStatus: () => router.push('/status'),
    openComponents: () => router.push('/componentes'),
  };
}
