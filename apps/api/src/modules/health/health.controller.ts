import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
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
