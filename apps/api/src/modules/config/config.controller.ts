import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { AppConfigService } from './config.service';

@Controller('config')
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  // TODO: ler o plano do usuário autenticado (hoje pública, devolve o plano free).
  @Public()
  @Get()
  get() {
    return { plan: 'free', flags: this.configService.flags('free') };
  }
}
