import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from './config.service';

@Controller('config')
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  // TODO: ler o plano do usuário autenticado quando o módulo auth existir.
  @Get()
  get() {
    return { plan: 'free', flags: this.configService.flags('free') };
  }
}
