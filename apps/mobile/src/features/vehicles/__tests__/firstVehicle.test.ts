import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { createVehicle, listVehicles } from '../models/vehicles.repository';
import {
  buildVehicleInput,
  emptyFirstVehicleForm,
  formatKm,
  parseKm,
} from '../models/firstVehicle';

const full = {
  ...emptyFirstVehicleForm,
  brand: 'VW',
  model: ' Gol ',
  year: '2019',
  nickname: 'Golzinho',
  km: '48.320',
};

describe('firstVehicle', () => {
  it('lê e formata o km em pt-BR', () => {
    expect(parseKm('48.320')).toBe(48320);
    expect(parseKm('')).toBeNull();
    expect(formatKm('48320')).toBe('48.320');
    expect(formatKm('abc')).toBe('');
  });

  it('exige marca, modelo, ano e km; o apelido é opcional', () => {
    expect(buildVehicleInput(emptyFirstVehicleForm).errors).toEqual({
      brand: 'Informe a marca',
      model: 'Informe o modelo',
      year: 'Informe o ano',
      km: 'Informe o km atual',
    });
    expect(buildVehicleInput({ ...full, brand: '  ' }).errors).toEqual({
      brand: 'Informe a marca',
    });
    expect(buildVehicleInput({ ...full, nickname: '' }).errors).toBeUndefined();
  });

  it('rejeita ano inválido', () => {
    expect(buildVehicleInput({ ...full, year: '19' }, 2026).errors?.year).toBe('Ano inválido');
    expect(buildVehicleInput({ ...full, year: '1900' }, 2026).errors?.year).toBe('Ano inválido');
    expect(buildVehicleInput({ ...full, year: '2019' }, 2026).value?.year).toBe(2019);
  });

  it('usa o apelido, ou o modelo quando não há apelido', () => {
    expect(buildVehicleInput(full).value?.name).toBe('Golzinho');
    expect(buildVehicleInput({ ...full, nickname: ' ' }).value?.name).toBe('Gol');
  });

  it('monta o veículo; moto vira combustion', () => {
    expect(buildVehicleInput({ ...full, kind: 'motorcycle' }).value).toEqual({
      name: 'Golzinho',
      type: 'combustion',
      brand: 'VW',
      model: 'Gol',
      year: 2019,
      initialKm: 48320,
    });
  });

  it('o resultado passa na gravação do repositório', async () => {
    const db = createTestDb();
    await migrate(db);
    const built = buildVehicleInput(full, 2026);
    await createVehicle(db, built.value!);
    const [saved] = await listVehicles(db);
    expect(saved).toMatchObject({ name: 'Golzinho', model: 'Gol', year: 2019, initialKm: 48320 });
  });
});
