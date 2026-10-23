import { describe, expect, it } from 'vitest';
import { normalizeStationName, resolveStationName, suggestStations } from '../stations';

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
