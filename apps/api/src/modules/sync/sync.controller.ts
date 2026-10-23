import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { syncPullQuerySchema, syncPushRequestSchema } from '@ta-em-dia/shared';
import type { ZodType } from 'zod';
import { CurrentUserId } from '../../common/auth/current-user.decorator';
import { SyncService } from './sync.service';

/** Valida o pedido. Só os campos com erro voltam; o conteúdo (dados do usuário) nunca vai na resposta. */
function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Pedido inválido',
      fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))],
    });
  }
  return parsed.data;
}

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(200)
  push(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.sync.push(userId, parseRequest(syncPushRequestSchema, body));
  }

  @Get('pull')
  pull(@CurrentUserId() userId: string, @Query() query: unknown) {
    return this.sync.pull(userId, parseRequest(syncPullQuerySchema, query));
  }
}
