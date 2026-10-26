import { describe, expect, it } from 'vitest';
import { fuelDraftSchema, fuelEntryIssues, fuelEntrySyncSchema } from '..';

const base = {
  id: '0190a5c8-7b1e-7000-8000-000000000001',
  vehicleId: '0190a5c8-7b1e-7000-8000-000000000002',
  date: new Date('2026-10-26T12:00:00Z'),
};

const full = {
  ...base,
  km: 45300,
  fuelType: 'gasoline' as const,
  liters: 25,
  total: 150,
  fullTank: true,
  stationName: 'Shell',
};

describe('fuelEntryIssues', () => {
  const codes = (input: Parameters<typeof fuelEntryIssues>[0], lastKm: number | null) =>
    fuelEntryIssues(input, lastKm).map((issue) => issue.code);

  it('sem problema, nada a avisar', () => {
    expect(codes({ km: 45300, pricePerLiter: 6, liters: 25, total: 150 }, 45000)).toEqual([]);
  });

  it('km menor que o último', () => {
    expect(fuelEntryIssues({ km: 44999 }, 45000)).toEqual([{ field: 'km', code: 'KM_BELOW_LAST' }]);
  });

  it('km igual ao último vale; 2.000 acima vale; 2.001 não', () => {
    expect(codes({ km: 45000 }, 45000)).toEqual([]);
    expect(codes({ km: 47000 }, 45000)).toEqual([]);
    expect(fuelEntryIssues({ km: 47001 }, 45000)).toEqual([{ field: 'km', code: 'KM_TOO_FAR' }]);
  });

  it('sem abastecimento anterior, o km não é conferido', () => {
    expect(codes({ km: 999999 }, null)).toEqual([]);
  });

  it('preço do litro fora de R$ 2 a R$ 12', () => {
    expect(codes({ pricePerLiter: 1.99 }, null)).toEqual(['PRICE_OUT_OF_RANGE']);
    expect(codes({ pricePerLiter: 12.01 }, null)).toEqual(['PRICE_OUT_OF_RANGE']);
    expect(codes({ pricePerLiter: 2 }, null)).toEqual([]);
    expect(codes({ pricePerLiter: 12 }, null)).toEqual([]);
  });

  it('sem preço, valor ÷ litros fora da faixa vira erro no preço', () => {
    // 150 ÷ 5 = R$ 30 o litro: provavelmente os números trocados.
    expect(fuelEntryIssues({ liters: 5, total: 150 }, null)).toEqual([
      { field: 'pricePerLiter', code: 'PRICE_OUT_OF_RANGE' },
    ]);
    expect(codes({ liters: 25, total: 150 }, null)).toEqual([]);
    expect(codes({ liters: 100, total: 150 }, null)).toEqual(['PRICE_OUT_OF_RANGE']);
  });

  it('valor, litros e preço que não batem (mais de 2%)', () => {
    expect(fuelEntryIssues({ pricePerLiter: 6, liters: 25, total: 160 }, null)).toEqual([
      { field: 'amounts', code: 'AMOUNTS_MISMATCH' },
    ]);
  });

  it('diferença de até 2% passa (arredondamento da bomba)', () => {
    expect(codes({ pricePerLiter: 6.299, liters: 38.25, total: 240.9 }, null)).toEqual([]);
    expect(codes({ pricePerLiter: 6, liters: 25, total: 152.9 }, null)).toEqual([]);
    expect(codes({ pricePerLiter: 6, liters: 25, total: 153.1 }, null)).toEqual([
      'AMOUNTS_MISMATCH',
    ]);
  });

  it('junta os problemas', () => {
    expect(codes({ km: 10, pricePerLiter: 20, liters: 10, total: 50 }, 100)).toEqual([
      'KM_BELOW_LAST',
      'PRICE_OUT_OF_RANGE',
      'AMOUNTS_MISMATCH',
    ]);
  });

  it('campos ausentes não geram erro', () => {
    expect(codes({}, 100)).toEqual([]);
    expect(codes({ liters: 25 }, 100)).toEqual([]);
  });
});

describe('contrato de sync (linhas legadas de rascunho)', () => {
  it('aceita rascunho só com o que se sabe', () => {
    const parsed = fuelEntrySyncSchema.parse({ ...base, status: 'draft', stationName: 'Shell' });
    expect(parsed).toMatchObject({ status: 'draft', stationName: 'Shell' });
    expect(fuelDraftSchema.safeParse({ ...base, status: 'draft' }).success).toBe(true);
  });

  it('abastecimento completo continua valendo sem `status`', () => {
    const parsed = fuelEntrySyncSchema.parse({ ...full, pricePerLiter: 6 });
    expect('status' in parsed).toBe(false);
    expect(parsed).toMatchObject({ km: 45300, liters: 25 });
  });

  it('abastecimento sem os campos obrigatórios e sem `status` não vale', () => {
    expect(fuelEntrySyncSchema.safeParse({ ...base, stationName: 'Shell' }).success).toBe(false);
  });
});
