import { Injectable } from '@nestjs/common';
import type { SyncTable } from '@ta-em-dia/shared';
import { SYNC_TABLES } from '@ta-em-dia/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { SYNC_SPECS, type RowData } from './sync.tables';

/** O que o service precisa saber de uma linha que já existe: de quem é e quando mudou. */
export interface RowMeta {
  ownerId: string;
  updatedAt: Date;
}

/** Uma mudança aceita, pronta para gravar. `version` vem de `nextVersion`. */
export interface UpsertInput {
  id: string;
  /** Dono da linha; só é gravado quando a linha nasce (nunca troca de dono). */
  userId: string;
  data: RowData;
  updatedAt: Date;
  version: bigint;
}

export interface DeleteInput {
  id: string;
  deletedAt: Date;
  updatedAt: Date;
  version: bigint;
}

/** As operações de um lote de push, todas dentro da mesma transação. */
export interface SyncSession {
  findMeta(table: SyncTable, id: string): Promise<RowMeta | null>;
  /** Próximo número do contador do usuário. A primeira chamada trava o usuário até o fim do lote. */
  nextVersion(): Promise<bigint>;
  upsert(table: SyncTable, input: UpsertInput): Promise<void>;
  softDelete(table: SyncTable, input: DeleteInput): Promise<void>;
}

/** Uma linha devolvida pelo pull, ainda no formato do banco. */
export interface PulledRow {
  table: SyncTable;
  id: string;
  version: bigint;
  updatedAt: Date;
  deletedAt: Date | null;
  row: Record<string, unknown>;
}

/** Os métodos do Prisma que o sync usa, iguais em todos os models. */
interface Delegate {
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  upsert(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
}

type Client = Prisma.TransactionClient;

const delegateOf = (client: Client, table: SyncTable): Delegate =>
  client[SYNC_SPECS[table].model] as unknown as Delegate;

/** Filtro "é do usuário": direto na linha, ou pelo veículo nas tabelas filhas. */
const ownedBy = (table: SyncTable, userId: string) =>
  SYNC_SPECS[table].ownedDirectly ? { userId } : { vehicle: { userId } };

class PrismaSession implements SyncSession {
  constructor(
    private readonly tx: Client,
    private readonly userId: string,
  ) {}

  async findMeta(table: SyncTable, id: string): Promise<RowMeta | null> {
    const select = SYNC_SPECS[table].ownedDirectly
      ? { updatedAt: true, userId: true }
      : { updatedAt: true, vehicle: { select: { userId: true } } };
    const row = await delegateOf(this.tx, table).findUnique({ where: { id }, select });
    if (!row) return null;
    const vehicle = row.vehicle as { userId: string } | undefined;
    return {
      ownerId: (vehicle?.userId ?? row.userId) as string,
      updatedAt: row.updatedAt as Date,
    };
  }

  async nextVersion(): Promise<bigint> {
    const user = await this.tx.user.update({
      where: { id: this.userId },
      data: { syncVersion: { increment: 1 } },
      select: { syncVersion: true },
    });
    return user.syncVersion;
  }

  async upsert(table: SyncTable, input: UpsertInput): Promise<void> {
    const owner = SYNC_SPECS[table].ownedDirectly ? { userId: input.userId } : {};
    const common = { updatedAt: input.updatedAt, deletedAt: null, version: input.version };
    await delegateOf(this.tx, table).upsert({
      where: { id: input.id },
      create: { id: input.id, ...owner, ...input.data, ...common, createdAt: input.updatedAt },
      update: { ...input.data, ...common },
    });
  }

  async softDelete(table: SyncTable, input: DeleteInput): Promise<void> {
    await delegateOf(this.tx, table).update({
      where: { id: input.id },
      data: { deletedAt: input.deletedAt, updatedAt: input.updatedAt, version: input.version },
    });
  }
}

@Injectable()
export class SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Roda um lote de push numa transação do usuário. Erro desfaz o lote inteiro. */
  transaction<T>(userId: string, work: (session: SyncSession) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(new PrismaSession(tx, userId)), {
      // O plano grátis do banco é lento; 100 mudanças por lote precisam de folga.
      timeout: 30_000,
    });
  }

  /**
   * As mudanças do usuário com `version` maior que `since`, do menor para o maior, até `limit`
   * linhas no total (de todas as tabelas). Cada tabela traz no máximo `limit`: juntas e
   * ordenadas, as primeiras `limit` são exatamente as próximas do usuário.
   */
  async listChanges(userId: string, since: bigint, limit: number): Promise<PulledRow[]> {
    const perTable = await Promise.all(
      SYNC_TABLES.map(async (table) => {
        const rows = await delegateOf(this.prisma, table).findMany({
          where: { version: { gt: since }, ...ownedBy(table, userId) },
          orderBy: { version: 'asc' },
          take: limit,
        });
        return rows.map((row): PulledRow => ({
          table,
          id: row.id as string,
          version: row.version as bigint,
          updatedAt: row.updatedAt as Date,
          deletedAt: row.deletedAt as Date | null,
          row,
        }));
      }),
    );
    return perTable
      .flat()
      .sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0))
      .slice(0, limit + 1);
  }

  /** Marca que o usuário sincronizou agora (o job de limpeza só apaga conta sem uso). */
  async touchDevices(userId: string, now: Date): Promise<void> {
    await this.prisma.device.updateMany({ where: { userId }, data: { lastSyncAt: now } });
  }
}
