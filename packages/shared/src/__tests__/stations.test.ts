import { describe, expect, it } from 'vitest';
import {
  normalizeStationName,
  resolveStationName,
  stationLabel,
  stationPriceAverage,
  suggestStations,
} from '../stations';

describe('normalizeStationName', () => {
  it('ignora maiúsculas, acentos e espaços repetidos', () => {
    expect(normalizeStationName('  Posto   ÍPIRANGA ')).toBe('posto ipiranga');
    expect(normalizeStationName('Auto Posto São João')).toBe('auto posto sao joao');
  });
});

describe('resolveStationName', () => {
  const known = ['Posto Ipiranga', 'Shell Centro'];

  it('reaproveita o nome já usado', () => {
    expect(resolveStationName(known, 'posto ípiranga')).toBe('Posto Ipiranga');
    expect(resolveStationName(known, 'SHELL  centro ')).toBe('Shell Centro');
  });

  it('nome novo cria o posto, sem espaços sobrando', () => {
    expect(resolveStationName(known, '  Posto   Br ')).toBe('Posto Br');
  });

  it('vazio vira undefined', () => {
    expect(resolveStationName(known, '   ')).toBeUndefined();
  });
});

describe('suggestStations', () => {
  const known = ['Posto Ipiranga', 'Shell Centro', 'posto ipiranga', 'Auto Posto São João'];

  it('sem texto, devolve os mais usados sem repetir', () => {
    expect(suggestStations(known, '')).toEqual([
      'Posto Ipiranga',
      'Shell Centro',
      'Auto Posto São João',
    ]);
  });

  it('filtra sem diferenciar maiúsculas e acentos', () => {
    expect(suggestStations(known, 'sao')).toEqual(['Auto Posto São João']);
    expect(suggestStations(known, 'IPIR')).toEqual(['Posto Ipiranga']);
  });

  it('não sugere o que já está escrito igual', () => {
    expect(suggestStations(known, 'Shell Centro')).toEqual([]);
  });

  it('sugere o nome existente quando só a grafia difere', () => {
    expect(suggestStations(known, 'shell centro')).toEqual(['Shell Centro']);
  });

  it('respeita o limite', () => {
    expect(suggestStations(['A1', 'A2', 'A3'], 'a', 2)).toEqual(['A1', 'A2']);
  });
});

describe('stationLabel', () => {
  it('nome e rua: "Shell · Av. da Pista"', () => {
    expect(stationLabel({ name: 'Shell', brand: 'Shell', street: 'Av. da Pista' })).toBe(
      'Shell · Av. da Pista',
    );
  });

  it('sem nome usa a bandeira; sem os dois, "Posto"', () => {
    expect(stationLabel({ name: null, brand: 'Ipiranga', street: 'Rua A' })).toBe(
      'Ipiranga · Rua A',
    );
    expect(stationLabel({ name: null, brand: null, street: 'Rua das Flores' })).toBe(
      'Posto · Rua das Flores',
    );
    expect(stationLabel({})).toBe('Posto');
  });

  it('sem rua, só o nome; rua igual ao nome não repete', () => {
    expect(stationLabel({ name: 'Posto do Zé' })).toBe('Posto do Zé');
    expect(stationLabel({ name: 'Av. Brasil', street: 'av. brasil' })).toBe('Av. Brasil');
  });

  it('tira espaços sobrando e corta em 80 caracteres', () => {
    expect(stationLabel({ name: '  Shell  Centro ', street: ' Rua  1 ' })).toBe(
      'Shell Centro · Rua 1',
    );
    const long = stationLabel({ name: 'Auto Posto', street: 'R'.repeat(100) });
    expect(long).toHaveLength(80);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('stationPriceAverage', () => {
  const rows = [
    {
      stationId: 's1',
      stationName: 'Shell · Av. da Pista',
      fuelType: 'gasoline',
      liters: 20,
      total: 120,
    },
    {
      stationId: 's1',
      stationName: 'Shell · Av. da Pista',
      fuelType: 'gasoline',
      liters: 30,
      total: 186,
    },
    {
      stationId: null,
      stationName: 'shell · av. da pista',
      fuelType: 'gasoline',
      liters: 10,
      total: 59,
    },
    {
      stationId: 's1',
      stationName: 'Shell · Av. da Pista',
      fuelType: 'ethanol',
      liters: 40,
      total: 160,
    },
    { stationId: 's2', stationName: 'Ipiranga', fuelType: 'gasoline', liters: 10, total: 70 },
  ];

  it('pesa pelos litros, por combustível, e junta os antigos pelo nome', () => {
    const avg = stationPriceAverage(rows, { id: 's1', name: 'Shell · Av. da Pista' }, 'gasoline');
    expect(avg?.count).toBe(3);
    expect(avg?.pricePerLiter).toBeCloseTo((120 + 186 + 59) / 60, 6);
  });

  it('acha pelo id mesmo com outro nome', () => {
    expect(stationPriceAverage(rows, { id: 's2', name: 'Outro nome' }, 'gasoline')).toEqual({
      pricePerLiter: 7,
      count: 1,
    });
  });

  it('sem abastecimento do combustível no posto: null', () => {
    expect(stationPriceAverage(rows, { name: 'Ipiranga' }, 'diesel')).toBeNull();
    expect(stationPriceAverage(rows, { name: '' }, 'gasoline')).toBeNull();
  });
});
