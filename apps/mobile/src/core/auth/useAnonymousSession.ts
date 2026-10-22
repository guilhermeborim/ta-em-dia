import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { apiUrl } from '../env/appEnv';
import * as SecureStore from 'expo-secure-store';
import { ensureAnonymousSession } from './anonymousSession';
import { createSessionKeeper } from './sessionKeeper';

/**
 * Cria o usuário anônimo na API quando há internet, sem atrapalhar o app: tenta ao abrir e ao
 * voltar para a frente, e repete com espera crescente enquanto a API não responde. Só liga depois
 * do "Continuar sem login". Em plataforma sem iOS/Android (web) não faz nada.
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
    return () => {
      appState.remove();
      keeper.stop();
    };
  }, [enabled]);
}
