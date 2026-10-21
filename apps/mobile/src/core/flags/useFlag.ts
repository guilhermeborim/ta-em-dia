import { DEFAULT_FLAGS, FeatureFlags, FlagKey } from '@ta-em-dia/shared';

/**
 * Lê uma feature flag. Por enquanto usa os padrões do plano free;
 * depois virá do cache de GET /v1/config salvo no SQLite.
 */
export function useFlag<K extends FlagKey>(key: K): FeatureFlags[K] {
  return DEFAULT_FLAGS.free[key];
}
