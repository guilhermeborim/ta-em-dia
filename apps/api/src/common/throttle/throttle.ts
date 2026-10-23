/** Janela dos limites de chamadas por IP (ms). */
export const THROTTLE_WINDOW_MS = 60_000;

/**
 * Chamadas por IP por janela. O padrão vale para toda rota; as de entrada (`/auth/*`) são mais
 * estritas porque não exigem token. Atrás do CGNAT das operadoras muita gente divide um IP, então
 * os números são folgados para quem usa o app de verdade e baratos para quem tenta encher o banco.
 */
export const THROTTLE_LIMITS = {
  default: 100,
  anonymous: 20,
  refresh: 30,
  /** Entrar com Google/Apple e vincular: cada chamada valida um `id_token` com as chaves do provedor. */
  social: 20,
} as const;
