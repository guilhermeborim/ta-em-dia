import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

const jwt = new JwtService({ secret: 'test-secret' });

function context(authorization: string | undefined, isPublic = false) {
  const request: { headers: Record<string, string | undefined>; userId?: string } = {
    headers: { authorization },
  };
  const target = () => undefined;
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, target);
  const ctx = {
    getHandler: () => target,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

const guard = new JwtAuthGuard(new Reflector(), jwt);

describe('JwtAuthGuard', () => {
  it('rota pública passa sem token', async () => {
    await expect(guard.canActivate(context(undefined, true).ctx)).resolves.toBe(true);
  });

  it('token válido passa e põe o userId do token na requisição', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: 60 });
    const { ctx, request } = context(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.userId).toBe('user-1');
  });

  it.each([
    ['sem cabeçalho', undefined],
    ['sem Bearer', 'abc'],
    ['token de lixo', 'Bearer abc'],
  ])('%s: 401 UNAUTHORIZED', async (_name, header) => {
    const error = await guard.canActivate(context(header).ctx).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('token expirado ou de outro segredo: 401', async () => {
    const expired = await jwt.signAsync({ sub: 'u' }, { expiresIn: -10 });
    const other = await new JwtService({ secret: 'outro' }).signAsync({ sub: 'u' });
    for (const token of [expired, other]) {
      await expect(guard.canActivate(context(`Bearer ${token}`).ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });

  it('token sem sub: 401', async () => {
    const token = await jwt.signAsync({}, { expiresIn: 60 });
    await expect(guard.canActivate(context(`Bearer ${token}`).ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
