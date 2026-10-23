import { describe, expect, it } from 'vitest';
import {
  SYNC_PULL_DEFAULT_LIMIT,
  SYNC_PUSH_MAX_CHANGES,
  SYNC_UPSERT_SCHEMAS,
  SYNC_TABLES,
  syncChangeSchema,
  syncDeletePayloadSchema,
  syncPullQuerySchema,
  syncPushRequestSchema,
} from '../sync';

const ID = '018bcfe5-6800-7000-8000-000000000001';
const change = {
  table: 'vehicles',
  id: ID,
  op: 'upsert',
  updatedAt: '2026-10-23T12:00:00.000Z',
  payload: {},
};

describe('syncChangeSchema', () => {
  it('aceita qualquer payload (a API confere por tabela)', () => {
    expect(syncChangeSchema.safeParse({ ...change, payload: { qualquer: 1 } }).success).toBe(true);
  });

  it('recusa tabela desconhecida, id que não é uuid e data sem formato ISO', () => {
    expect(syncChangeSchema.safeParse({ ...change, table: 'users' }).success).toBe(false);
    expect(syncChangeSchema.safeParse({ ...change, id: '1' }).success).toBe(false);
    expect(syncChangeSchema.safeParse({ ...change, updatedAt: '23/10/2026' }).success).toBe(false);
    expect(syncChangeSchema.safeParse({ ...change, op: 'patch' }).success).toBe(false);
  });
});

describe('syncPushRequestSchema', () => {
  it(`aceita até ${SYNC_PUSH_MAX_CHANGES} mudanças`, () => {
    const changes = (n: number) => Array.from({ length: n }, () => change);
    expect(
      syncPushRequestSchema.safeParse({ protocol: 1, changes: changes(SYNC_PUSH_MAX_CHANGES) })
        .success,
    ).toBe(true);
    expect(
      syncPushRequestSchema.safeParse({ protocol: 1, changes: changes(SYNC_PUSH_MAX_CHANGES + 1) })
        .success,
    ).toBe(false);
  });

  it('exige o número do protocolo', () => {
    expect(syncPushRequestSchema.safeParse({ changes: [] }).success).toBe(false);
  });
});

describe('syncPullQuerySchema', () => {
  it('usa 0 e o limite padrão; lê números da query string', () => {
    expect(syncPullQuerySchema.parse({ protocol: '1' })).toEqual({
      protocol: 1,
      since: '0',
      limit: SYNC_PULL_DEFAULT_LIMIT,
    });
    expect(syncPullQuerySchema.parse({ protocol: '1', since: '42', limit: '10' })).toMatchObject({
      since: '42',
      limit: 10,
    });
  });

  it('recusa since que não é inteiro e limite fora de 1 a 500', () => {
    expect(syncPullQuerySchema.safeParse({ protocol: '1', since: '-1' }).success).toBe(false);
    expect(syncPullQuerySchema.safeParse({ protocol: '1', since: 'abc' }).success).toBe(false);
    expect(syncPullQuerySchema.safeParse({ protocol: '1', limit: '0' }).success).toBe(false);
    expect(syncPullQuerySchema.safeParse({ protocol: '1', limit: '501' }).success).toBe(false);
  });
});

describe('payloads', () => {
  it('toda tabela tem schema de upsert', () => {
    expect(Object.keys(SYNC_UPSERT_SCHEMAS).sort()).toEqual([...SYNC_TABLES].sort());
  });

  it('a exclusão leva só o id e a data', () => {
    expect(
      syncDeletePayloadSchema.parse({ id: ID, deletedAt: '2026-10-23T12:00:00.000Z' }),
    ).toEqual({ id: ID, deletedAt: new Date('2026-10-23T12:00:00.000Z') });
    expect(syncDeletePayloadSchema.safeParse({ id: ID }).success).toBe(false);
  });
});
