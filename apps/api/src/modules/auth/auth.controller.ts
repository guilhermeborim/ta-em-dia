import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { anonymousAuthSchema, refreshRequestSchema } from '@ta-em-dia/shared';
import type { ZodType } from 'zod';
import { Public } from '../../common/auth/public.decorator';
import { THROTTLE_LIMITS, THROTTLE_WINDOW_MS } from '../../common/throttle/throttle';
import { AuthService } from './auth.service';

/** Valida o corpo. Só os campos com erro voltam; o corpo (segredo, token) nunca vai na resposta nem para log. */
function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Pedido inválido',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  }
  return parsed.data;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: THROTTLE_LIMITS.anonymous, ttl: THROTTLE_WINDOW_MS } })
  @Post('anonymous')
  @HttpCode(200)
  anonymous(@Body() body: unknown) {
    return this.auth.anonymous(parseBody(anonymousAuthSchema, body));
  }

  @Public()
  @Throttle({ default: { limit: THROTTLE_LIMITS.refresh, ttl: THROTTLE_WINDOW_MS } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: unknown) {
    return this.auth.refresh(parseBody(refreshRequestSchema, body));
  }
}
