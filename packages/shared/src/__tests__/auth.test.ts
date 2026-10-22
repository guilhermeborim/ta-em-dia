import { describe, expect, it } from 'vitest';
import { anonymousAuthSchema } from '../auth';

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
