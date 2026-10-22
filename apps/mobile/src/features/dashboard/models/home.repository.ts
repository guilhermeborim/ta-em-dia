import {
  dailyAverageKm,
  type FuelEntry,
  type MaintenancePlan,
  type Vehicle,
} from '@ta-em-dia/shared';
import type { Db } from '../../../core/db';
import { listFuelEntries } from '../../../core/fuel';
import { listPlans, loadVehicleKm } from '../../../core/maintenance';

export interface HomeState {
  /** Veículo mostrado no topo (o primeiro de "Meus veículos"). `null` se não há veículo. */
  vehicle:
    | (Pick<Vehicle, 'id' | 'name' | 'brand' | 'model' | 'year' | 'initialKm'> & {
        /** O maior entre o km inicial e o do último abastecimento, serviço ou leitura manual. */
        currentKm: number;
      })
    | null;
  /** Abastecimentos do veículo, do mais recente ao mais antigo. */
  entries: FuelEntry[];
  /** Média de km por dia (abastecimentos e leituras manuais; 30 km/dia sem histórico). */
  dailyKm: number;
  /** Planos de manutenção do veículo (ativos e desativados). */
  plans: MaintenancePlan[];
}

interface VehicleRow {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  initial_km: number;
}

/** Lê do SQLite o que o Início precisa: o veículo e seus abastecimentos. */
export async function loadHomeState(db: Db): Promise<HomeState> {
  const row = await db.getFirstAsync<VehicleRow>(
    `SELECT id, name, brand, model, year, initial_km
       FROM vehicles
      WHERE deleted_at IS NULL AND archived = 0
      ORDER BY sort_order, created_at, id
      LIMIT 1`,
  );
  if (!row) return { vehicle: null, entries: [], dailyKm: dailyAverageKm([]), plans: [] };

  const entries = await listFuelEntries(db, row.id);
  const { currentKm, dailyKm } = await loadVehicleKm(db, row.id, row.initial_km);

  return {
    vehicle: {
      id: row.id,
      name: row.name,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      year: row.year ?? undefined,
      initialKm: row.initial_km,
      currentKm,
    },
    entries,
    dailyKm,
    plans: await listPlans(db, row.id),
  };
}
