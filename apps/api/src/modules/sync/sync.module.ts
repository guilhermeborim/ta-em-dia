import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncRepository } from './sync.repository';
import { SyncService } from './sync.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncRepository],
})
export class SyncModule {}
