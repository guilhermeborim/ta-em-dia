import { z } from 'zod';

/**
 * Postos do OpenStreetMap por região (Fase C). O app manda só a célula do geohash, nunca a
 * coordenada; a API devolve os postos (`amenity=fuel`) que caem dentro dela.
 */

/** Caracteres do geohash: célula de ~4,9 km × 4,9 km no Equador. */
export const PLACES_GEOHASH_PRECISION = 5;

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Retângulo de uma célula, em graus. */
export interface GeohashBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Célula do geohash que contém o ponto (Praça da Sé, `-23.5505, -46.6333` → `6gyf4`). */
export function encodeGeohash(
  lat: number,
  lng: number,
  precision: number = PLACES_GEOHASH_PRECISION,
): string {
  let south = -90;
  let north = 90;
  let west = -180;
  let east = 180;
  let hash = '';
  let bits = 0;
  let value = 0;
  let isLng = true;
  while (hash.length < precision) {
    if (isLng) {
      const mid = (west + east) / 2;
      value = value * 2 + (lng >= mid ? 1 : 0);
      if (lng >= mid) west = mid;
      else east = mid;
    } else {
      const mid = (south + north) / 2;
      value = value * 2 + (lat >= mid ? 1 : 0);
      if (lat >= mid) south = mid;
      else north = mid;
    }
    isLng = !isLng;
    if (++bits === 5) {
      hash += BASE32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}

/** Retângulo da célula. Lança erro se o texto tiver caractere fora do alfabeto do geohash. */
export function geohashBounds(hash: string): GeohashBounds {
  let south = -90;
  let north = 90;
  let west = -180;
  let east = 180;
  let isLng = true;
  for (const char of hash.toLowerCase()) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error('Geohash inválido');
    for (let bit = 4; bit >= 0; bit--) {
      const on = ((value >> bit) & 1) === 1;
      if (isLng) {
        const mid = (west + east) / 2;
        if (on) west = mid;
        else east = mid;
      } else {
        const mid = (south + north) / 2;
        if (on) south = mid;
        else north = mid;
      }
      isLng = !isLng;
    }
  }
  return { south, west, north, east };
}

/**
 * A célula e as 8 vizinhas (a primeira é a própria). O app baixa os postos dessas 9 células para
 * achar o posto mais perto mesmo na borda da célula e guardar a região para usar sem internet.
 * Perto dos polos as vizinhas de cima ou de baixo não existem e ficam de fora.
 */
export function geohashNeighborhood(hash: string): string[] {
  const box = geohashBounds(hash);
  const height = box.north - box.south;
  const width = box.east - box.west;
  const lat = (box.south + box.north) / 2;
  const lng = (box.west + box.east) / 2;
  const cells = [hash.toLowerCase()];
  for (const dLat of [-1, 0, 1]) {
    for (const dLng of [-1, 0, 1]) {
      if (dLat === 0 && dLng === 0) continue;
      const nextLat = lat + dLat * height;
      if (nextLat <= -90 || nextLat >= 90) continue;
      // Do outro lado da linha de data, a longitude volta a -180..180.
      const nextLng = ((((lng + dLng * width + 180) % 360) + 360) % 360) - 180;
      const cell = encodeGeohash(nextLat, nextLng, hash.length);
      if (!cells.includes(cell)) cells.push(cell);
    }
  }
  return cells;
}

/** Pedido de `GET /v1/places`: maiúsculas viram minúsculas; só 5 caracteres do alfabeto. */
export const placesQuerySchema = z.object({
  geohash: z
    .string()
    .trim()
    .toLowerCase()
    .regex(new RegExp(`^[${BASE32}]{${PLACES_GEOHASH_PRECISION}}$`)),
});

/** Um posto do OpenStreetMap. `osmId` é único e estável (`node/123`, `way/456`). */
export const placeSchema = z.object({
  osmId: z.string().regex(/^(node|way|relation)\/\d+$/),
  /** Nome do posto; sem nome no OSM, vem a bandeira; sem as duas, `null`. */
  name: z.string().nullable(),
  brand: z.string().nullable(),
  street: z.string().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const placesResponseSchema = z.object({
  geohash: z.string(),
  places: z.array(placeSchema),
  /** Quando a lista foi buscada no OpenStreetMap (ISO 8601). */
  fetchedAt: z.iso.datetime(),
});

export type PlacesQuery = z.infer<typeof placesQuerySchema>;
export type Place = z.infer<typeof placeSchema>;
export type PlacesResponse = z.infer<typeof placesResponseSchema>;
