import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { placesQuerySchema } from '@ta-em-dia/shared';
import { PlacesService } from './places.service';

/** Exige token (inclusive o anônimo). Não recebe `userId`: a resposta é igual para todo mundo. */
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(@Query() query: unknown) {
    const parsed = placesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Pedido inválido',
        fields: ['geohash'],
      });
    }
    return this.places.list(parsed.data.geohash);
  }
}
