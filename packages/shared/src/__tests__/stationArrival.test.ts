import { describe, expect, it } from 'vitest';
import { distanceMeters } from '../geo';
import { encodeGeohash, geohashBounds } from '../places';
import {
  arrivalAreaCenter,
  isSameLocalDay,
  pickArrivalStations,
  pruneArrivalLog,
  shouldNotifyStationArrival,
  STATION_ARRIVAL_COOLDOWN_MS,
  STATION_ARRIVAL_REGION_LIMIT,
  STATION_ARRIVAL_STATION_LIMIT,
  stationArrivalMessage,
} from '../stationArrival';

const HERE = { lat: -23.5614, lng: -46.6559 };
// ~111 m por milésimo de grau de latitude.
const at = (key: string, metersNorth: number, uses = 0) => ({
  key,
  lat: HERE.lat + metersNorth / 111_000,
  lng: HERE.lng,
  uses,
});

describe('pickArrivalStations', () => {
  it('vigia 19 postos: 20 regiões do iOS menos a da área', () => {
    expect(STATION_ARRIVAL_REGION_LIMIT).toBe(20);
    expect(STATION_ARRIVAL_STATION_LIMIT).toBe(19);
    const many = Array.from({ length: 30 }, (_, i) => at(`node/${i}`, 100 * (i + 1)));
    expect(pickArrivalStations(HERE, many)).toHaveLength(19);
  });

  it('os usados primeiro, do mais usado; depois os mais perto', () => {
    const picked = pickArrivalStations(
      HERE,
      [
        at('perto', 50),
        at('usado-1x', 3_000, 1),
        at('meio', 500),
        at('usado-5x', 8_000, 5),
        at('usado-1x-perto', 1_000, 1),
      ],
      4,
    );
    expect(picked.map((s) => s.key)).toEqual(['usado-5x', 'usado-1x-perto', 'usado-1x', 'perto']);
  });

  it('deixa de fora posto a mais de 10 km, mesmo o mais usado', () => {
    const picked = pickArrivalStations(HERE, [at('longe', 12_000, 9), at('perto', 200)]);
    expect(picked.map((s) => s.key)).toEqual(['perto']);
  });

  it('a mesma chave vale uma vez (a primeira)', () => {
    const picked = pickArrivalStations(HERE, [at('node/1', 100, 2), at('node/1', 100, 0)]);
    expect(picked).toHaveLength(1);
    expect(picked[0]!.uses).toBe(2);
  });

  it('sem postos, nada', () => {
    expect(pickArrivalStations(HERE, [])).toEqual([]);
  });
});

describe('arrivalAreaCenter', () => {
  it('é o centro da célula de ~5 km, não a posição', () => {
    const center = arrivalAreaCenter(HERE);
    const box = geohashBounds(encodeGeohash(HERE.lat, HERE.lng));
    expect(center.lat).toBeCloseTo((box.south + box.north) / 2, 10);
    expect(center.lng).toBeCloseTo((box.west + box.east) / 2, 10);
    expect(center).not.toEqual(HERE);
    expect(distanceMeters(center, HERE)).toBeLessThan(3_500);
  });

  it('duas posições na mesma célula dão o mesmo centro', () => {
    expect(arrivalAreaCenter(HERE)).toEqual(
      arrivalAreaCenter({ lat: HERE.lat + 0.001, lng: HERE.lng }),
    );
  });
});

describe('isSameLocalDay', () => {
  it('compara no fuso do aparelho', () => {
    expect(isSameLocalDay(new Date(2026, 9, 26, 0, 1), new Date(2026, 9, 26, 23, 59))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 9, 25, 23, 59), new Date(2026, 9, 26, 0, 1))).toBe(false);
  });
});

describe('shouldNotifyStationArrival', () => {
  const now = new Date(2026, 9, 26, 18, 0);

  it('avisa sem aviso nem abastecimento antes', () => {
    expect(shouldNotifyStationArrival({ now })).toBe(true);
    expect(shouldNotifyStationArrival({ now, lastNotifiedAt: null, lastFuelAt: null })).toBe(true);
  });

  it('não avisa se já houve abastecimento hoje, mesmo de manhã cedo', () => {
    expect(shouldNotifyStationArrival({ now, lastFuelAt: new Date(2026, 9, 26, 0, 5) })).toBe(
      false,
    );
  });

  it('avisa se o último abastecimento foi ontem', () => {
    expect(shouldNotifyStationArrival({ now, lastFuelAt: new Date(2026, 9, 25, 23, 50) })).toBe(
      true,
    );
  });

  it('no máximo um aviso por posto a cada 12 h', () => {
    const justBefore = new Date(now.getTime() - STATION_ARRIVAL_COOLDOWN_MS + 60_000);
    const exactly = new Date(now.getTime() - STATION_ARRIVAL_COOLDOWN_MS);
    expect(shouldNotifyStationArrival({ now, lastNotifiedAt: justBefore })).toBe(false);
    expect(shouldNotifyStationArrival({ now, lastNotifiedAt: exactly })).toBe(true);
  });

  it('aviso marcado para daqui a pouco também conta', () => {
    const soon = new Date(now.getTime() + 60_000);
    expect(shouldNotifyStationArrival({ now, lastNotifiedAt: soon })).toBe(false);
  });
});

describe('pruneArrivalLog', () => {
  it('guarda só os avisos das últimas 12 h', () => {
    const now = new Date('2026-10-26T20:00:00.000Z');
    expect(
      pruneArrivalLog(
        {
          'node/1': '2026-10-26T19:00:00.000Z',
          'node/2': '2026-10-26T08:00:00.000Z',
          'node/3': '2026-10-26T07:00:00.000Z',
          'node/4': 'não é data',
          'node/5': '2026-10-26T20:02:00.000Z',
        },
        now,
      ),
    ).toEqual({ 'node/1': '2026-10-26T19:00:00.000Z', 'node/5': '2026-10-26T20:02:00.000Z' });
  });
});

describe('stationArrivalMessage', () => {
  it('usa o rótulo do posto', () => {
    expect(stationArrivalMessage('Shell · Av. da Pista')).toBe(
      'Abastecendo no Shell · Av. da Pista? Registre agora.',
    );
  });
});
