import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { apiUrl } from '../env/appEnv';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { ensureAnonymousSession } from './anonymousSession';
import { createSessionKeeper, shouldRetryOnNetwork } from './sessionKeeper';

/**
 * Cria o usuário anônimo na API (e renova o acesso) quando há internet, sem atrapalhar o app: tenta
 * ao abrir, ao voltar para a frente e quando a internet volta, e repete com espera crescente
 * enquanto a API não responde. Só liga depois do "Continuar sem login". Em plataforma sem
 * iOS/Android (web) não faz nada.
 */
export function useAnonymousSession(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;

    const platform = Platform.OS;
    const keeper = createSessionKeeper(() =>
      ensureAnonymousSession({ apiUrl, platform, store: SecureStore }),
    );
    keeper.check();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') keeper.check();
      else keeper.stop();
    });
    // A internet voltou com o app aberto: tenta já, sem esperar a próxima espera do keeper.
    const network = Network.addNetworkStateListener((state) => {
      if (AppState.currentState === 'active' && shouldRetryOnNetwork(state)) keeper.check();
    });
    return () => {
      appState.remove();
      network.remove();
      keeper.stop();
    };
  }, [enabled]);
}
