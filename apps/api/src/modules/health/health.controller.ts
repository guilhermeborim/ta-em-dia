import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/auth/public.decorator';

// O health check do deploy e do host chama a toda hora: fora do rate limit.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      env: process.env.APP_ENV ?? 'development',
      // O Render define RENDER_GIT_COMMIT: mostra qual commit está no ar.
      version: process.env.RENDER_GIT_COMMIT ?? 'local',
    };
  }
}
