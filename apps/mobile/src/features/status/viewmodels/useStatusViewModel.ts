import { useCallback, useEffect, useState } from 'react';
import { apiUrl, appEnv } from '../../../core/env/appEnv';
import { ApiStatus, fetchApiStatus } from '../models/status.service';

type State = { loading: true } | ({ loading: false } & ApiStatus);

/** ViewModel da tela de diagnóstico: ambiente do app e estado da API. */
export function useStatusViewModel() {
  const [state, setState] = useState<State>({ loading: true });

  const refresh = useCallback(async () => {
    setState({ loading: true });
    setState({ loading: false, ...(await fetchApiStatus(apiUrl)) });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  let apiLabel = 'Consultando...';
  if (!state.loading) {
    apiLabel = state.ok ? 'API ok' : `API com problema: ${state.error ?? 'resposta inesperada'}`;
  }

  return {
    title: 'Olá, mundo!',
    envLabel: `Ambiente do app: ${appEnv}`,
    apiUrlLabel: `API: ${apiUrl}`,
    apiLabel,
    apiEnvLabel: !state.loading && state.env ? `Ambiente da API: ${state.env}` : null,
    versionLabel: !state.loading && state.version ? `Versão da API: ${state.version}` : null,
    loading: state.loading,
    refresh,
  };
}
