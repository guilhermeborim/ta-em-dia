import { Module } from '@nestjs/common';
import { AppConfigController } from './config.controller';
import { AppConfigService } from './config.service';

@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService],
})
export class AppConfigModule {}
