import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/** `userId` do token. Toda consulta filtra por ele, nunca por um id vindo do corpo da requisição. */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().userId;
});
