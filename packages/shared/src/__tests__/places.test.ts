import { describe, expect, it } from 'vitest';
import { encodeGeohash, geohashBounds, placeSchema, placesQuerySchema } from '../places';

describe('encodeGeohash', () => {
  it('confere com o exemplo clássico (57.64911, 10.40744 → u4pruydqqvj)', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
  });

  it('usa 5 caracteres por padrão', () => {
    expect(encodeGeohash(57.64911, 10.40744)).toBe('u4pru');
  });

  it('pontos a poucos metros caem na mesma célula', () => {
    expect(encodeGeohash(-23.5505, -46.6333)).toBe(encodeGeohash(-23.5507, -46.6331));
  });
});

describe('geohashBounds', () => {
  it('a célula contém o ponto que a gerou', () => {
    const lat = -23.5505;
    const lng = -46.6333;
    const box = geohashBounds(encodeGeohash(lat, lng));
    expect(lat).toBeGreaterThanOrEqual(box.south);
    expect(lat).toBeLessThan(box.north);
    expect(lng).toBeGreaterThanOrEqual(box.west);
    expect(lng).toBeLessThan(box.east);
  });

  it('célula de 5 caracteres mede 0,04394° × 0,04394°', () => {
    const box = geohashBounds('u4pru');
    expect(box.north - box.south).toBeCloseTo(180 / 2 ** 12, 10);
    expect(box.east - box.west).toBeCloseTo(360 / 2 ** 13, 10);
  });

  it('caractere fora do alfabeto lança erro', () => {
    expect(() => geohashBounds('u4pra')).toThrow('Geohash inválido');
  });
});

describe('placesQuerySchema', () => {
  it('aceita 5 caracteres e passa para minúscula', () => {
    expect(placesQuerySchema.parse({ geohash: ' U4PRU ' })).toEqual({ geohash: 'u4pru' });
  });

  it('recusa tamanho errado e letras fora do alfabeto (a, i, l, o)', () => {
    for (const geohash of ['u4pr', 'u4prub', 'u4pra', 'u4pri', 'u4prl', 'u4pro', '']) {
      expect(placesQuerySchema.safeParse({ geohash }).success).toBe(false);
    }
  });
});

describe('placeSchema', () => {
  it('osmId tem o tipo e o número', () => {
    const place = { name: 'Shell', brand: 'Shell', street: null, lat: -23.5, lng: -46.6 };
    expect(placeSchema.safeParse({ ...place, osmId: 'node/123' }).success).toBe(true);
    expect(placeSchema.safeParse({ ...place, osmId: 'way/45' }).success).toBe(true);
    expect(placeSchema.safeParse({ ...place, osmId: '123' }).success).toBe(false);
  });
});
