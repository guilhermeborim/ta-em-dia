/**
 * Feature flags por plano. A API serve os valores em GET /v1/config;
 * estes padrões ficam embutidos no app para funcionar offline.
 * No lançamento o plano free tem tudo liberado.
 */

export type Plan = 'free' | 'premium';

export interface FeatureFlags {
  'vehicles.max': number | null;
  'sync.cloud': boolean;
  'reports.advanced': boolean;
  'export.pdf': boolean;
  'geo.fuelReminder': boolean;
  'attachments.max': number | null;
}

export type FlagKey = keyof FeatureFlags;

export const DEFAULT_FLAGS: Record<Plan, FeatureFlags> = {
  free: {
    'vehicles.max': null,
    'sync.cloud': true,
    'reports.advanced': true,
    'export.pdf': false,
    'geo.fuelReminder': false,
    'attachments.max': null,
  },
  premium: {
    'vehicles.max': null,
    'sync.cloud': true,
    'reports.advanced': true,
    'export.pdf': true,
    'geo.fuelReminder': true,
    'attachments.max': null,
  },
};

export function flagsFor(plan: Plan, overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return { ...DEFAULT_FLAGS[plan], ...overrides };
}
