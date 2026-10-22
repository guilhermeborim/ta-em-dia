import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loadSession } from '../../../core/auth';
import { useDb } from '../../../core/db';
import { apiUrl, appEnv } from '../../../core/env/appEnv';
import { resetApp } from '../models/resetApp.service';
import { ApiStatus, fetchApiStatus, sessionLabel } from '../models/status.service';

type State = { loading: true } | ({ loading: false } & ApiStatus);

/** ViewModel da tela de diagnóstico: ambiente do app e estado da API. */
export function useStatusViewModel() {
  const db = useDb();
  const [state, setState] = useState<State>({ loading: true });
  const [session, setSession] = useState<string>('');

  const refresh = useCallback(async () => {
    setState({ loading: true });
    setState({ loading: false, ...(await fetchApiStatus(apiUrl)) });
    setSession(sessionLabel(await loadSession(SecureStore), new Date()));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reset = useCallback(async () => {
    await resetApp(db);
    await Updates.reloadAsync();
  }, [db]);

  let apiLabel = 'Consultando...';
  if (!state.loading) {
    apiLabel = state.ok ? 'API ok' : `API com problema: ${state.error ?? 'resposta inesperada'}`;
  }

  return {
    title: 'Olá, mundo!',
    envLabel: `Ambiente do app: ${appEnv}`,
    apiUrlLabel: `API: ${apiUrl}`,
    apiLabel,
    sessionLabel: session,
    apiEnvLabel: !state.loading && state.env ? `Ambiente da API: ${state.env}` : null,
    versionLabel: !state.loading && state.version ? `Versão da API: ${state.version}` : null,
    loading: state.loading,
    refresh,
    // Ferramenta de desenvolvimento: nunca aparece em produção.
    canReset: appEnv !== 'production',
    reset,
  };
}
