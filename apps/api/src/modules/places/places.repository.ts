import { Injectable } from '@nestjs/common';
import type { Place } from '@ta-em-dia/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Uma célula guardada: os postos e quando foram buscados no OpenStreetMap. */
export interface PlaceCellRow {
  places: Place[];
  fetchedAt: Date;
}

/** Cache das células no banco (o host grátis dorme e perde a memória). Sem usuário: dado público. */
@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCell(geohash: string): Promise<PlaceCellRow | null> {
    const row = await this.prisma.placeCell.findUnique({ where: { geohash } });
    return row ? { places: row.places as unknown as Place[], fetchedAt: row.fetchedAt } : null;
  }

  async saveCell(geohash: string, cell: PlaceCellRow): Promise<void> {
    const data = { places: cell.places, fetchedAt: cell.fetchedAt };
    await this.prisma.placeCell.upsert({
      where: { geohash },
      create: { geohash, ...data },
      update: data,
    });
  }
}
