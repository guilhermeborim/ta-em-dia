import { describe, expect, it } from 'vitest';
import {
  accountExistsSchema,
  anonymousAuthSchema,
  authTokensSchema,
  linkRequestSchema,
  linkResultSchema,
  socialAuthSchema,
} from '../auth';

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

describe('socialAuthSchema', () => {
  const social = {
    idToken: 'a.b.c',
    installationId: '018bcfe5-6800-7000-8000-000000000001',
    platform: 'ios',
  };

  it('aceita o pedido do app, com ou sem nome', () => {
    expect(socialAuthSchema.parse(social)).toEqual(social);
    expect(socialAuthSchema.parse({ ...social, name: ' Ana ' }).name).toBe('Ana');
  });

  it('recusa token vazio, id que não é UUID e plataforma desconhecida', () => {
    expect(socialAuthSchema.safeParse({ ...social, idToken: '' }).success).toBe(false);
    expect(socialAuthSchema.safeParse({ ...social, installationId: 'abc' }).success).toBe(false);
    expect(socialAuthSchema.safeParse({ ...social, platform: 'web' }).success).toBe(false);
  });

  it('o vínculo exige o provedor e só aceita as duas estratégias de conflito', () => {
    const link = { ...social, provider: 'google' };
    expect(linkRequestSchema.safeParse(link).success).toBe(true);
    expect(linkRequestSchema.safeParse({ ...link, onConflict: 'merge' }).success).toBe(true);
    expect(linkRequestSchema.safeParse({ ...link, onConflict: 'apagar' }).success).toBe(false);
    expect(linkRequestSchema.safeParse({ ...social, provider: 'facebook' }).success).toBe(false);
    expect(linkRequestSchema.safeParse(social).success).toBe(false);
  });
});

describe('linkResultSchema e accountExistsSchema', () => {
  const tokens = {
    accessToken: 'a.b.c',
    expiresIn: 900,
    refreshToken: 'r',
    user: { id: 'u1', isAnonymous: false, plan: 'free' },
  };

  it('o resultado é o par de tokens mais o que aconteceu', () => {
    expect(linkResultSchema.safeParse({ ...tokens, outcome: 'merged' }).success).toBe(true);
    expect(linkResultSchema.safeParse(tokens).success).toBe(false);
    expect(linkResultSchema.safeParse({ ...tokens, outcome: 'outro' }).success).toBe(false);
  });

  it('o 409 traz quantos veículos e registros a conta tem', () => {
    const body = { code: 'ACCOUNT_EXISTS', account: { vehicles: 2, records: 22 } };
    expect(accountExistsSchema.safeParse(body).success).toBe(true);
    expect(accountExistsSchema.safeParse({ ...body, code: 'X' }).success).toBe(false);
  });
});
