import { retryDelay } from '../auth/sessionKeeper';

export type SyncRunOutcome = 'done' | 'retry' | 'rejected' | 'skipped';

/** Espera depois de uma gravação, para juntar várias numa ida só. */
export const SYNC_DEBOUNCE_MS = 5_000;

export interface SyncScheduler {
  /** Pede um sync. Sem `immediate`, espera `SYNC_DEBOUNCE_MS` (várias gravações viram um sync). */
  request: (options?: { immediate?: boolean }) => void;
  /** Para de agendar (o app foi fechado). Um `request` depois volta a agendar. */
  stop: () => void;
}

interface Timers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
}

/**
 * Decide quando rodar o sync: um por vez; pedido que chega com um em andamento roda de novo
 * quando ele acaba (não se perde uma gravação feita no meio do envio); se a API não respondeu,
 * tenta de novo com espera crescente (15 s a 5 min); parou por `done`, `rejected` ou `skipped`.
 */
export function createSyncScheduler(
  run: () => Promise<SyncRunOutcome>,
  timers: Timers = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
  debounceMs: number = SYNC_DEBOUNCE_MS,
): SyncScheduler {
  let running = false;
  let again = false;
  let stopped = false;
  let attempt = 0;
  let timer: unknown = null;

  const cancel = () => {
    if (timer !== null) {
      timers.clear(timer);
      timer = null;
    }
  };

  const schedule = (ms: number) => {
    cancel();
    timer = timers.set(() => void execute(), ms);
  };

  const execute = async () => {
    timer = null;
    if (running || stopped) return;
    running = true;
    let outcome: SyncRunOutcome = 'retry';
    try {
      outcome = await run();
    } catch {
      outcome = 'retry';
    } finally {
      running = false;
    }
    if (stopped) return;

    if (outcome === 'retry') {
      schedule(retryDelay(attempt));
      attempt += 1;
    } else {
      attempt = 0;
    }
    // Chegou um pedido durante o envio: roda de novo, sem esperar a espera do `retry`.
    if (again) {
      again = false;
      schedule(0);
    }
  };

  return {
    request: (options = {}) => {
      stopped = false;
      if (running) {
        again = true;
        return;
      }
      if (options.immediate) attempt = 0;
      schedule(options.immediate ? 0 : debounceMs);
    },
    stop: () => {
      stopped = true;
      again = false;
      cancel();
    },
  };
}
