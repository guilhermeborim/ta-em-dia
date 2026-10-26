import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { geohashBounds, type PlacesResponse } from '@ta-em-dia/shared';
import { OverpassClient } from './overpass.client';
import { PlacesRepository, type PlaceCellRow } from './places.repository';

/** Validade de uma célula no cache: postos mudam pouco, e o Overpass é um serviço gratuito. */
export const PLACES_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Postos do OpenStreetMap por célula do geohash. Uma chamada ao Overpass por célula e por
 * validade, nunca por usuário. O geohash não é ligado ao usuário nem vai para log.
 */
@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  /** Célula sendo buscada agora: quem pede a mesma célula espera a mesma consulta. */
  private readonly inFlight = new Map<string, Promise<PlaceCellRow | null>>();

  constructor(
    private readonly repository: PlacesRepository,
    private readonly overpass: OverpassClient,
  ) {}

  async list(geohash: string): Promise<PlacesResponse> {
    const cached = await this.repository.findCell(geohash);
    const fresh = cached && Date.now() - cached.fetchedAt.getTime() < PLACES_CACHE_TTL_MS;
    // Overpass fora do ar: a lista vencida ainda serve (postos mudam pouco).
    const cell = fresh ? cached : ((await this.refresh(geohash)) ?? cached);
    if (!cell) {
      throw new HttpException(
        {
          code: 'PLACES_UNAVAILABLE',
          message: 'Não foi possível buscar os postos agora. Tente de novo mais tarde.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { geohash, places: cell.places, fetchedAt: cell.fetchedAt.toISOString() };
  }

  /** Busca no Overpass e grava. Falhou, devolve `null`; quem chamou decide o que fazer. */
  private refresh(geohash: string): Promise<PlaceCellRow | null> {
    const running = this.inFlight.get(geohash);
    if (running) return running;
    const work = (async () => {
      try {
        const cell = {
          places: await this.overpass.fetchFuelStations(geohashBounds(geohash)),
          fetchedAt: new Date(),
        };
        await this.repository.saveCell(geohash, cell);
        return cell;
      } catch (error) {
        // Sem o geohash na mensagem: ele aponta a região do usuário.
        this.logger.warn(`Postos indisponíveis: ${(error as Error).message}`);
        return null;
      } finally {
        this.inFlight.delete(geohash);
      }
    })();
    this.inFlight.set(geohash, work);
    return work;
  }
}
