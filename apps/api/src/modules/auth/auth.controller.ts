import { BadRequestException, Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  anonymousAuthSchema,
  linkRequestSchema,
  refreshRequestSchema,
  socialAuthSchema,
} from '@ta-em-dia/shared';
import type { ZodType } from 'zod';
import { CurrentUserId } from '../../common/auth/current-user.decorator';
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

  @Public()
  @Throttle({ default: { limit: THROTTLE_LIMITS.social, ttl: THROTTLE_WINDOW_MS } })
  @Post('google')
  @HttpCode(200)
  google(@Body() body: unknown) {
    return this.auth.social('google', parseBody(socialAuthSchema, body));
  }

  @Public()
  @Throttle({ default: { limit: THROTTLE_LIMITS.social, ttl: THROTTLE_WINDOW_MS } })
  @Post('apple')
  @HttpCode(200)
  apple(@Body() body: unknown) {
    return this.auth.social('apple', parseBody(socialAuthSchema, body));
  }

  /** Exige o token do usuário anônimo (rota não pública): o `userId` vem dele, nunca do corpo. */
  @Throttle({ default: { limit: THROTTLE_LIMITS.social, ttl: THROTTLE_WINDOW_MS } })
  @Post('link')
  @HttpCode(200)
  link(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.auth.link(userId, parseBody(linkRequestSchema, body));
  }

  /** Exclusão de conta (LGPD e App Store 5.1.1(v)): o `userId` vem do token, nunca do corpo. */
  @Throttle({ default: { limit: THROTTLE_LIMITS.social, ttl: THROTTLE_WINDOW_MS } })
  @Delete('account')
  @HttpCode(200)
  deleteAccount(@CurrentUserId() userId: string) {
    return this.auth.deleteAccount(userId);
  }
}
