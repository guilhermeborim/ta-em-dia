import { ConfigService } from '@nestjs/config';
import {
  OVERPASS_MAX_CONCURRENT,
  OverpassClient,
  overpassQuery,
  parseOverpass,
} from './overpass.client';

const BOUNDS = { south: -23.6, west: -46.7, north: -23.5, east: -46.6 };

describe('parseOverpass', () => {
  it('ponto e área viram postos com osmId, nome, bandeira e rua', () => {
    const places = parseOverpass({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: -23.55,
          lon: -46.63,
          tags: {
            amenity: 'fuel',
            name: 'Posto Pista',
            brand: 'Shell',
            'addr:street': 'Av. da Pista',
          },
        },
        { type: 'way', id: 2, center: { lat: -23.56, lon: -46.64 }, tags: { brand: 'Ipiranga' } },
      ],
    });
    expect(places).toEqual([
      {
        osmId: 'node/1',
        name: 'Posto Pista',
        brand: 'Shell',
        street: 'Av. da Pista',
        lat: -23.55,
        lng: -46.63,
      },
      {
        osmId: 'way/2',
        name: 'Ipiranga',
        brand: 'Ipiranga',
        street: null,
        lat: -23.56,
        lng: -46.64,
      },
    ]);
  });

  it('sem nome nem bandeira, nome fica null; texto em branco também', () => {
    const [place] = parseOverpass({
      elements: [{ type: 'node', id: 3, lat: 1, lon: 2, tags: { name: '  ' } }],
    });
    expect(place).toMatchObject({ name: null, brand: null, street: null });
  });

  it('descarta elemento sem coordenada ou de tipo desconhecido', () => {
    expect(
      parseOverpass({
        elements: [
          { type: 'way', id: 4, tags: { name: 'Sem centro' } },
          { type: 'area', id: 5, lat: 1, lon: 2 },
        ],
      }),
    ).toEqual([]);
  });

  it('resposta sem elements lança erro', () => {
    expect(() => parseOverpass({ remark: 'runtime error' })).toThrow();
    expect(() => parseOverpass(null)).toThrow();
  });
});

describe('overpassQuery', () => {
  it('busca amenity=fuel no retângulo (sul, oeste, norte, leste) com centro das áreas', () => {
    const query = overpassQuery(BOUNDS);
    expect(query).toContain('nwr["amenity"="fuel"](-23.6,-46.7,-23.5,-46.6)');
    expect(query).toContain('out center tags');
  });
});

describe('OverpassClient', () => {
  const config = {
    getOrThrow: () => 'https://overpass.test/api/interpreter',
  } as unknown as ConfigService;
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('faz POST com a consulta e devolve os postos', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ type: 'node', id: 9, lat: 1, lon: 2, tags: { name: 'BR' } }],
      }),
    });
    global.fetch = fetchMock;
    const places = await new OverpassClient(config).fetchFuelStations(BOUNDS);
    expect(places).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://overpass.test/api/interpreter');
    expect(init.method).toBe('POST');
    expect((init.body as URLSearchParams).get('data')).toBe(overpassQuery(BOUNDS));
  });

  it('status de erro lança, sem a consulta na mensagem', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(new OverpassClient(config).fetchFuelStations(BOUNDS)).rejects.toThrow(
      'Overpass respondeu 429',
    );
  });

  it(`no máximo ${OVERPASS_MAX_CONCURRENT} consultas ao mesmo tempo; as outras esperam`, async () => {
    let running = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    global.fetch = jest.fn().mockImplementation(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise<void>((resolve) => releases.push(resolve));
      running--;
      return { ok: true, json: async () => ({ elements: [] }) };
    });
    const client = new OverpassClient(config);
    const calls = Array.from({ length: 5 }, () => client.fetchFuelStations(BOUNDS));
    while (calls.length > 0) {
      await new Promise((resolve) => setImmediate(resolve));
      const release = releases.shift();
      if (!release) continue;
      release();
      await calls.shift();
    }
    expect(peak).toBe(OVERPASS_MAX_CONCURRENT);
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });
});
