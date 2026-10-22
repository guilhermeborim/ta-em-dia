import { inactiveCutoff, purgeInactive } from './purge-inactive';

const NOW = new Date('2026-10-22T12:00:00.000Z');

/** Banco falso: guarda o que o job pediu e devolve contagens fixas. */
function fakeDb() {
  const calls: { op: string; model: string; where: unknown }[] = [];
  const model = (name: string, total: number) => ({
    count: async ({ where }: { where: unknown }) => {
      calls.push({ op: 'count', model: name, where });
      return total;
    },
    deleteMany: async ({ where }: { where: unknown }) => {
      calls.push({ op: 'delete', model: name, where });
      return { count: total };
    },
  });
  return {
    calls,
    db: { user: model('user', 3), refreshToken: model('refreshToken', 7) } as never,
  };
}

describe('inactiveCutoff', () => {
  it('são 12 meses antes', () => {
    expect(inactiveCutoff(NOW)).toEqual(new Date('2025-10-22T12:00:00.000Z'));
  });
});

describe('purgeInactive', () => {
  it('apaga as contas anônimas sem uso e os tokens vencidos, usuários primeiro', async () => {
    const { calls, db } = fakeDb();
    const result = await purgeInactive(db, NOW);

    expect(result).toEqual({ anonymousUsers: 3, refreshTokens: 7 });
    expect(calls.map((c) => `${c.op}:${c.model}`)).toEqual(['delete:user', 'delete:refreshToken']);
  });

  it('só toca em conta anônima criada antes do corte e sem aparelho ativo desde o corte', async () => {
    const { calls, db } = fakeDb();
    await purgeInactive(db, NOW);
    const cutoff = new Date('2025-10-22T12:00:00.000Z');

    expect(calls[0].where).toEqual({
      isAnonymous: true,
      createdAt: { lt: cutoff },
      devices: { none: { OR: [{ lastSeenAt: { gte: cutoff } }, { lastSyncAt: { gte: cutoff } }] } },
    });
    // Token revogado ainda dentro da validade fica (serve para detectar reuso).
    expect(calls[1].where).toEqual({ expiresAt: { lt: new Date('2026-10-21T12:00:00.000Z') } });
  });

  it('simulação: só conta, não apaga nada', async () => {
    const { calls, db } = fakeDb();
    const result = await purgeInactive(db, NOW, { dryRun: true });

    expect(result).toEqual({ anonymousUsers: 3, refreshTokens: 7 });
    expect(calls.every((c) => c.op === 'count')).toBe(true);
  });
});
