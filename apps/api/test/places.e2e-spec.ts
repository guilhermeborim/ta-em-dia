import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { placesResponseSchema } from '@ta-em-dia/shared';
import { AppModule } from '../src/app.module';
import { OverpassClient } from '../src/modules/places/overpass.client';
import { PlacesRepository, type PlaceCellRow } from '../src/modules/places/places.repository';

const USER = '018bcfe5-6800-7000-8000-0000000000aa';

/** Banco e Overpass de mentira: o CI não depende de rede nem do Postgres. */
const cells = new Map<string, PlaceCellRow>();
const fakeRepository = {
  async findCell(geohash: string) {
    return cells.get(geohash) ?? null;
  },
  async saveCell(geohash: string, cell: PlaceCellRow) {
    cells.set(geohash, cell);
  },
};
const fakeOverpass = {
  fetchFuelStations: jest.fn(async () => [
    {
      osmId: 'node/1',
      name: 'Shell',
      brand: 'Shell',
      street: 'Av. da Pista',
      lat: -23.55,
      lng: -46.63,
    },
  ]),
};

describe('places (e2e)', () => {
  let app: INestApplication;
  let auth: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PlacesRepository)
      .useValue(fakeRepository)
      .overrideProvider(OverpassClient)
      .useValue(fakeOverpass)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
    auth = `Bearer ${await moduleRef.get(JwtService).signAsync({ sub: USER })}`;
  });

  afterAll(() => app.close());

  it('sem token: 401', async () => {
    await request(app.getHttpServer()).get('/v1/places?geohash=6gyf4').expect(401);
  });

  it('geohash inválido: 400 VALIDATION_ERROR sem ecoar o valor', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/places?geohash=6gyfa')
      .set('Authorization', auth)
      .expect(400);
    expect(res.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Pedido inválido',
      fields: ['geohash'],
    });
  });

  it('devolve os postos da célula; o segundo pedido vem do cache', async () => {
    const first = await request(app.getHttpServer())
      .get('/v1/places?geohash=6GYF4')
      .set('Authorization', auth)
      .expect(200);
    const body = placesResponseSchema.parse(first.body);
    expect(body.geohash).toBe('6gyf4');
    expect(body.places[0]).toMatchObject({ osmId: 'node/1', name: 'Shell' });

    await request(app.getHttpServer())
      .get('/v1/places?geohash=6gyf4')
      .set('Authorization', auth)
      .expect(200);
    expect(fakeOverpass.fetchFuelStations).toHaveBeenCalledTimes(1);
  });
});
