import type { SessionOutcome } from './anonymousSession';

/** Esperas entre tentativas quando a API não responde: 15 s, 30 s, 1, 2, 5 min (e fica em 5). */
export const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

export const retryDelay = (attempt: number): number =>
  RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;

/** O que importa de uma mudança do estado da rede (`expo-network`). */
export interface NetworkSnapshot {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

/** Vale tentar agora: há conexão e o sistema não diz que a internet está fora (`undefined` = não sabe). */
export const shouldRetryOnNetwork = (state: NetworkSnapshot): boolean =>
  state.isConnected === true && state.isInternetReachable !== false;

export interface SessionKeeper {
  /** Tenta agora (ao abrir o app e ao voltar a ele). Ignorado se já há uma tentativa em curso. */
  check: () => void;
  /** Para de tentar (o app saiu da frente ou foi fechado). */
  stop: () => void;
}

/**
 * Mantém a tentativa de criar a sessão: roda `ensure` e, se a API não respondeu, tenta de novo com
 * espera crescente. Para quando deu certo ou quando a API recusou o aparelho.
 */
export function createSessionKeeper(
  ensure: () => Promise<SessionOutcome>,
  timers: {
    set: (fn: () => void, ms: number) => unknown;
    clear: (id: unknown) => void;
  } = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
): SessionKeeper {
  let running = false;
  let stopped = false;
  let attempt = 0;
  let timer: unknown = null;

  const run = async () => {
    if (running || stopped) return;
    running = true;
    timer = null;
    let outcome: SessionOutcome = 'retry';
    try {
      outcome = await ensure();
    } finally {
      running = false;
    }
    if (stopped) return;
    if (outcome === 'retry') {
      timer = timers.set(() => void run(), retryDelay(attempt));
      attempt += 1;
    } else {
      attempt = 0;
    }
  };

  return {
    check: () => {
      stopped = false;
      if (timer !== null) {
        timers.clear(timer);
        timer = null;
      }
      void run();
    },
    stop: () => {
      stopped = true;
      if (timer !== null) {
        timers.clear(timer);
        timer = null;
      }
    },
  };
}
