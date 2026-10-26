import { Module } from '@nestjs/common';
import { OverpassClient } from './overpass.client';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, PlacesRepository, OverpassClient],
})
export class PlacesModule {}
