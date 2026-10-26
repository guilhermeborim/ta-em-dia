import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeohashBounds, Place } from '@ta-em-dia/shared';

/** Tempo máximo de uma consulta ao Overpass (ms). Passou disso, a API desiste e usa o cache. */
export const OVERPASS_TIMEOUT_MS = 30_000;

/**
 * Consultas ao mesmo tempo. A instância pública do Overpass dá poucas vagas por IP e toda a API
 * sai do mesmo IP, então as outras esperam na fila.
 */
export const OVERPASS_MAX_CONCURRENT = 2;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const text = (value: string | undefined): string | null => value?.trim() || null;

/** Converte a resposta do Overpass. Elemento sem coordenada ou de tipo desconhecido fica de fora. */
export function parseOverpass(body: unknown): Place[] {
  const elements = (body as { elements?: OverpassElement[] } | null)?.elements;
  if (!Array.isArray(elements)) throw new Error('Resposta do Overpass sem elements');
  const places: Place[] = [];
  for (const element of elements) {
    if (!['node', 'way', 'relation'].includes(element.type)) continue;
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    const tags = element.tags ?? {};
    const brand = text(tags.brand);
    places.push({
      osmId: `${element.type}/${element.id}`,
      name: text(tags.name) ?? brand,
      brand,
      street: text(tags['addr:street']),
      lat,
      lng,
    });
  }
  return places;
}

/** Consulta Overpass: todo `amenity=fuel` (ponto, área ou relação) dentro do retângulo. */
export function overpassQuery({ south, west, north, east }: GeohashBounds): string {
  return `[out:json][timeout:25];nwr["amenity"="fuel"](${south},${west},${north},${east});out center tags;`;
}

/** Cliente da API Overpass (OpenStreetMap). Gratuita; nunca é chamada por usuário, só por célula. */
@Injectable()
export class OverpassClient {
  private running = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly config: ConfigService) {}

  async fetchFuelStations(bounds: GeohashBounds): Promise<Place[]> {
    await this.acquire();
    try {
      const response = await fetch(this.config.getOrThrow<string>('OVERPASS_URL'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // A política do Overpass pede que o cliente se identifique.
          'User-Agent': 'TaEmDia-API/1.0',
        },
        body: new URLSearchParams({ data: overpassQuery(bounds) }),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Overpass respondeu ${response.status}`);
      return parseOverpass(await response.json());
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < OVERPASS_MAX_CONCURRENT) {
      this.running++;
      return;
    }
    // Quem sai passa a vaga direto para o próximo da fila, sem descer o contador.
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.running--;
  }
}
