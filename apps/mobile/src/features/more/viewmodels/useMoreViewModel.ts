import { useRouter } from 'expo-router';
import { appEnv } from '../../../core/env/appEnv';

/** ViewModel da aba Mais: Meus veículos, Histórico e, fora de produção, os atalhos de desenvolvimento. */
export function useMoreViewModel() {
  const router = useRouter();
  const isDev = appEnv !== 'production';

  return {
    showDevTools: isDev,
    openVehicles: () => router.push('/veiculos'),
    openHistory: () => router.push('/historico'),
    openStatus: () => router.push('/status'),
    openComponents: () => router.push('/componentes'),
  };
}
