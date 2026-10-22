import { migrate } from '../../../core/db/migrations';
import { createTestDb } from '../../../core/db/testing/testDb';
import { createVehicle, listVehicles } from '../models/vehicles.repository';
import {
  buildVehicleInput,
  emptyFirstVehicleForm,
  formatKm,
  parseKm,
} from '../models/firstVehicle';

const form = { ...emptyFirstVehicleForm, km: '48.320' };

describe('firstVehicle', () => {
  it('lê e formata o km em pt-BR', () => {
    expect(parseKm('48.320')).toBe(48320);
    expect(parseKm('')).toBeNull();
    expect(formatKm('48320')).toBe('48.320');
    expect(formatKm('abc')).toBe('');
  });

  it('exige o km', () => {
    expect(buildVehicleInput({ ...form, km: '' }).errors).toEqual({ km: 'Informe o km atual' });
  });

  it('rejeita ano inválido, aceita vazio', () => {
    expect(buildVehicleInput({ ...form, year: '19' }, 2026).errors?.year).toBe('Ano inválido');
    expect(buildVehicleInput({ ...form, year: '1900' }, 2026).errors?.year).toBe('Ano inválido');
    expect(buildVehicleInput({ ...form, year: '2019' }, 2026).value?.year).toBe(2019);
    expect(buildVehicleInput(form, 2026).value?.year).toBeUndefined();
  });

  it('usa apelido, depois modelo, depois nome padrão', () => {
    const base = { ...form, model: ' Gol ' };
    expect(buildVehicleInput({ ...base, nickname: 'Golzinho' }).value?.name).toBe('Golzinho');
    expect(buildVehicleInput(base).value?.name).toBe('Gol');
    expect(buildVehicleInput(form).value?.name).toBe('Meu carro');
    expect(buildVehicleInput({ ...form, kind: 'motorcycle' }).value?.name).toBe('Minha moto');
  });

  it('monta o veículo sem campos vazios', () => {
    expect(
      buildVehicleInput({ ...form, brand: 'VW', model: '', kind: 'motorcycle' }).value,
    ).toEqual({
      name: 'Minha moto',
      type: 'combustion',
      brand: 'VW',
      model: undefined,
      year: undefined,
      initialKm: 48320,
    });
  });

  it('o resultado passa na gravação do repositório', async () => {
    const db = createTestDb();
    await migrate(db);
    const built = buildVehicleInput(
      { ...form, model: 'Gol', year: '2019', nickname: 'Golzinho' },
      2026,
    );
    await createVehicle(db, built.value!);
    const [saved] = await listVehicles(db);
    expect(saved).toMatchObject({ name: 'Golzinho', model: 'Gol', year: 2019, initialKm: 48320 });
  });
});
