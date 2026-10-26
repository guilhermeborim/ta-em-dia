import { HttpException, Logger } from '@nestjs/common';
import type { Place } from '@ta-em-dia/shared';
import { geohashBounds } from '@ta-em-dia/shared';
import type { OverpassClient } from './overpass.client';
import type { PlaceCellRow, PlacesRepository } from './places.repository';
import { PLACES_CACHE_TTL_MS, PlacesService } from './places.service';

const NOW = new Date('2026-10-26T12:00:00Z');
const SHELL: Place = {
  osmId: 'node/1',
  name: 'Shell',
  brand: 'Shell',
  street: 'Av. da Pista',
  lat: -23.55,
  lng: -46.63,
};
const IPIRANGA: Place = { ...SHELL, osmId: 'node/2', name: 'Ipiranga', brand: 'Ipiranga' };

function setup(stored: PlaceCellRow | null) {
  const cells = new Map<string, PlaceCellRow>();
  if (stored) cells.set('6gyf4', stored);
  const repository = {
    findCell: jest.fn(async (geohash: string) => cells.get(geohash) ?? null),
    saveCell: jest.fn(async (geohash: string, cell: PlaceCellRow) => void cells.set(geohash, cell)),
  };
  const overpass = { fetchFuelStations: jest.fn(async () => [IPIRANGA]) };
  const service = new PlacesService(
    repository as unknown as PlacesRepository,
    overpass as unknown as OverpassClient,
  );
  return { service, repository, overpass };
}

describe('PlacesService', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['setImmediate', 'nextTick'] });
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('célula no cache e dentro da validade: não chama o Overpass', async () => {
    const fetchedAt = new Date(NOW.getTime() - PLACES_CACHE_TTL_MS + 1000);
    const { service, overpass } = setup({ places: [SHELL], fetchedAt });
    await expect(service.list('6gyf4')).resolves.toEqual({
      geohash: '6gyf4',
      places: [SHELL],
      fetchedAt: fetchedAt.toISOString(),
    });
    expect(overpass.fetchFuelStations).not.toHaveBeenCalled();
  });

  it('célula nova: busca no retângulo do geohash, grava e devolve', async () => {
    const { service, overpass, repository } = setup(null);
    const result = await service.list('6gyf4');
    expect(overpass.fetchFuelStations).toHaveBeenCalledWith(geohashBounds('6gyf4'));
    expect(repository.saveCell).toHaveBeenCalledWith('6gyf4', {
      places: [IPIRANGA],
      fetchedAt: NOW,
    });
    expect(result).toEqual({ geohash: '6gyf4', places: [IPIRANGA], fetchedAt: NOW.toISOString() });
  });

  it('célula vencida: busca de novo e troca a lista', async () => {
    const fetchedAt = new Date(NOW.getTime() - PLACES_CACHE_TTL_MS);
    const { service, overpass } = setup({ places: [SHELL], fetchedAt });
    const result = await service.list('6gyf4');
    expect(overpass.fetchFuelStations).toHaveBeenCalledTimes(1);
    expect(result.places).toEqual([IPIRANGA]);
  });

  it('Overpass fora do ar com célula vencida: devolve a lista antiga', async () => {
    const fetchedAt = new Date(NOW.getTime() - 2 * PLACES_CACHE_TTL_MS);
    const { service, overpass, repository } = setup({ places: [SHELL], fetchedAt });
    overpass.fetchFuelStations.mockRejectedValue(new Error('Overpass respondeu 504'));
    const result = await service.list('6gyf4');
    expect(result).toEqual({
      geohash: '6gyf4',
      places: [SHELL],
      fetchedAt: fetchedAt.toISOString(),
    });
    expect(repository.saveCell).not.toHaveBeenCalled();
  });

  it('Overpass fora do ar sem cache: 503 PLACES_UNAVAILABLE e log sem o geohash', async () => {
    const { service, overpass } = setup(null);
    overpass.fetchFuelStations.mockRejectedValue(new Error('Overpass respondeu 429'));
    const error = await service.list('6gyf4').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(503);
    expect((error as HttpException).getResponse()).toMatchObject({ code: 'PLACES_UNAVAILABLE' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain('6gyf4');
  });

  it('pedidos ao mesmo tempo da mesma célula fazem uma consulta só', async () => {
    const { service, overpass } = setup(null);
    const results = await Promise.all([service.list('6gyf4'), service.list('6gyf4')]);
    expect(overpass.fetchFuelStations).toHaveBeenCalledTimes(1);
    expect(results[0]).toEqual(results[1]);
  });

  it('depois de uma falha, o pedido seguinte tenta de novo', async () => {
    const { service, overpass } = setup(null);
    overpass.fetchFuelStations.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.list('6gyf4')).rejects.toBeInstanceOf(HttpException);
    await expect(service.list('6gyf4')).resolves.toMatchObject({ places: [IPIRANGA] });
    expect(overpass.fetchFuelStations).toHaveBeenCalledTimes(2);
  });
});
