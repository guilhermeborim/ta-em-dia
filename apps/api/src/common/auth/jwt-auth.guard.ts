import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
}

/** Guard global: exige `Authorization: Bearer <accessToken>` em toda rota que não é `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token, {
        algorithms: ['HS256'],
      });
      if (!payload.sub) throw new Error('sem sub');
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token ausente ou inválido',
      });
    }
  }
}
