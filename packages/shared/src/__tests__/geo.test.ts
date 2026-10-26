import { describe, expect, it } from 'vitest';
import { distanceMeters, nearestWithin } from '../geo';

describe('distanceMeters', () => {
  it('é zero no mesmo ponto', () => {
    expect(distanceMeters({ lat: -23.55, lng: -46.63 }, { lat: -23.55, lng: -46.63 })).toBe(0);
  });

  it('um milésimo de grau de latitude são ~111 m', () => {
    const d = distanceMeters({ lat: -23.55, lng: -46.63 }, { lat: -23.551, lng: -46.63 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('da Praça da Sé (SP) à Candelária (RJ) são ~360 km', () => {
    const d = distanceMeters({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9007, lng: -43.1772 });
    expect(d / 1000).toBeGreaterThan(355);
    expect(d / 1000).toBeLessThan(365);
  });
});

describe('nearestWithin', () => {
  const here = { lat: -23.55, lng: -46.63 };
  const points = [
    { id: 'longe', lat: -23.56, lng: -46.63 }, // ~1,1 km
    { id: 'perto', lat: -23.551, lng: -46.63 }, // ~111 m
    { id: 'colado', lat: -23.5502, lng: -46.63 }, // ~22 m
  ];

  it('só os do raio, do mais perto ao mais longe, com a distância', () => {
    const result = nearestWithin(here, points, 150);
    expect(result.map((p) => p.id)).toEqual(['colado', 'perto']);
    expect(result[0]!.distanceM).toBeCloseTo(22.2, 0);
  });

  it('respeita o limite e mantém os campos do ponto', () => {
    expect(nearestWithin(here, points, 10_000, 1)).toEqual([
      expect.objectContaining({ id: 'colado', lat: -23.5502 }),
    ]);
  });

  it('empate na distância mantém a ordem de entrada', () => {
    const twins = [
      { id: 'a', lat: -23.551, lng: -46.63 },
      { id: 'b', lat: -23.551, lng: -46.63 },
    ];
    expect(nearestWithin(here, twins, 150).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('nada no raio devolve lista vazia', () => {
    expect(nearestWithin(here, points, 10)).toEqual([]);
  });
});
