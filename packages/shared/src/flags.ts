/**
 * Feature flags por plano. A API serve os valores em GET /v1/config;
 * estes padrões ficam embutidos no app para funcionar offline.
 * No lançamento o plano free tem tudo liberado, menos o limite de 1 veículo.
 */

export type Plan = 'free' | 'premium';

export interface FeatureFlags {
  'vehicles.max': number | null;
  'sync.cloud': boolean;
  /** Sincroniza também quem não fez login (usuário anônimo). Desligada até o dono decidir (docs/07). */
  'sync.anonymous': boolean;
  'reports.advanced': boolean;
  'export.pdf': boolean;
  'geo.fuelReminder': boolean;
  /** Valor do veículo na tabela FIPE (Fase 2). Desligada: o app mostra o cartão "Em breve". */
  'fipe.value': boolean;
  'attachments.max': number | null;
}

export type FlagKey = keyof FeatureFlags;

export const DEFAULT_FLAGS: Record<Plan, FeatureFlags> = {
  free: {
    'vehicles.max': 1,
    'sync.cloud': true,
    'sync.anonymous': false,
    'reports.advanced': true,
    'export.pdf': false,
    'geo.fuelReminder': false,
    'fipe.value': false,
    'attachments.max': null,
  },
  premium: {
    'vehicles.max': null,
    'sync.cloud': true,
    'sync.anonymous': false,
    'reports.advanced': true,
    'export.pdf': true,
    'geo.fuelReminder': true,
    'fipe.value': false,
    'attachments.max': null,
  },
};

export function flagsFor(plan: Plan, overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return { ...DEFAULT_FLAGS[plan], ...overrides };
}

/** Cabe mais um veículo? `max` nulo é sem limite; `count` é quantos já existem (arquivados contam). */
export function canAddVehicle(count: number, max: number | null): boolean {
  return max === null || count < max;
}

/**
 * Juntar os veículos do aparelho com os da conta cabe no plano? Sem veículo no aparelho não há o que
 * somar (os prazos e a CNH entram sempre). Arquivados contam, excluídos não. `max` nulo é sem limite.
 */
export function canMergeVehicles(local: number, account: number, max: number | null): boolean {
  return max === null || local === 0 || local + account <= max;
}
