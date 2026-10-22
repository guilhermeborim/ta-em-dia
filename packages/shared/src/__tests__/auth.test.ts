import { describe, expect, it } from 'vitest';
import { anonymousAuthSchema, authTokensSchema } from '../auth';

const valid = {
  installationId: '018bcfe5-6800-7000-8000-000000000001',
  secret: 'a'.repeat(64),
  platform: 'android',
};

describe('anonymousAuthSchema', () => {
  it('aceita o pedido do app', () => {
    expect(anonymousAuthSchema.parse(valid)).toEqual(valid);
  });

  it('recusa id que não é UUID, segredo curto e plataforma desconhecida', () => {
    expect(anonymousAuthSchema.safeParse({ ...valid, installationId: 'abc' }).success).toBe(false);
    expect(anonymousAuthSchema.safeParse({ ...valid, secret: 'curto' }).success).toBe(false);
    expect(anonymousAuthSchema.safeParse({ ...valid, platform: 'web' }).success).toBe(false);
  });

  it('recusa campos que faltam', () => {
    expect(anonymousAuthSchema.safeParse({}).success).toBe(false);
  });
});

describe('authTokensSchema', () => {
  const tokens = {
    accessToken: 'a.b.c',
    expiresIn: 900,
    refreshToken: 'r',
    user: { id: '018bcfe5-6800-7000-8000-000000000001', isAnonymous: true, plan: 'free' },
  };

  it('aceita a resposta da API', () => {
    expect(authTokensSchema.parse(tokens)).toEqual(tokens);
  });

  it('recusa resposta incompleta ou com tipos errados', () => {
    expect(authTokensSchema.safeParse({ ...tokens, accessToken: '' }).success).toBe(false);
    expect(authTokensSchema.safeParse({ ...tokens, expiresIn: '900' }).success).toBe(false);
    expect(authTokensSchema.safeParse({ ...tokens, user: { id: 'x' } }).success).toBe(false);
    expect(authTokensSchema.safeParse({}).success).toBe(false);
  });
});
