import { BadRequestException, Injectable } from '@nestjs/common';
import {
  SYNC_PROTOCOL_VERSION,
  syncDeletePayloadSchema,
  syncTablesFor,
  type SyncChange,
  type SyncPullQuery,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncPushResult,
  type SyncRejection,
} from '@ta-em-dia/shared';
import { SyncRepository, type SyncSession } from './sync.repository';
import { SYNC_SPECS } from './sync.tables';

/** Quanto o relógio do aparelho pode estar adiantado antes de ser ignorado (ms). */
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

const accepted = (change: SyncChange): SyncPushResult => ({
  table: change.table,
  id: change.id,
  status: 'accepted',
});

const rejected = (change: SyncChange, reason: SyncRejection): SyncPushResult => ({
  table: change.table,
  id: change.id,
  status: 'rejected',
  reason,
});

@Injectable()
export class SyncService {
  constructor(private readonly repository: SyncRepository) {}

  /**
   * Aplica um lote de mudanças do app, na ordem, numa transação só. "Última escrita vence" por
   * linha: vale se o `updatedAt` for maior ou igual ao do servidor. Mudança inválida é rejeitada
   * sem derrubar as outras; o `version` de cada aceita é do servidor.
   */
  async push(
    userId: string,
    request: SyncPushRequest,
    now: Date = new Date(),
  ): Promise<SyncPushResponse> {
    this.assertProtocol(request.protocol);
    const results = await this.repository.transaction(userId, async (session) => {
      const out: SyncPushResult[] = [];
      for (const change of request.changes) {
        out.push(await this.apply(session, userId, change, now));
      }
      return out;
    });
    await this.repository.touchDevices(userId, now);
    return { protocol: SYNC_PROTOCOL_VERSION, results };
  }

  /**
   * O que mudou para o usuário depois de `since`, do mais antigo ao mais novo, em páginas. Só as
   * tabelas que o protocolo do app conhece (o app do protocolo 1 não recebe `stations`).
   */
  async pull(
    userId: string,
    query: SyncPullQuery,
    now: Date = new Date(),
  ): Promise<SyncPullResponse> {
    this.assertProtocol(query.protocol);
    const since = BigInt(query.since);
    const rows = await this.repository.listChanges(
      userId,
      since,
      query.limit,
      syncTablesFor(query.protocol),
    );
    const page = rows.slice(0, query.limit);
    await this.repository.touchDevices(userId, now);

    return {
      protocol: SYNC_PROTOCOL_VERSION,
      changes: page.map((item) => {
        const base = {
          table: item.table,
          id: item.id,
          version: item.version.toString(),
          updatedAt: item.updatedAt.toISOString(),
        };
        return item.deletedAt
          ? {
              ...base,
              op: 'delete' as const,
              payload: { id: item.id, deletedAt: item.deletedAt.toISOString() },
            }
          : { ...base, op: 'upsert' as const, payload: SYNC_SPECS[item.table].toPayload(item.row) };
      }),
      nextSince: (page.at(-1)?.version ?? since).toString(),
      hasMore: rows.length > query.limit,
    };
  }

  private assertProtocol(protocol: number) {
    if (protocol > SYNC_PROTOCOL_VERSION) {
      throw new BadRequestException({
        code: 'SYNC_PROTOCOL_UNSUPPORTED',
        message: 'Versão do protocolo de sync não suportada',
        supported: SYNC_PROTOCOL_VERSION,
      });
    }
  }

  private async apply(
    session: SyncSession,
    userId: string,
    change: SyncChange,
    now: Date,
  ): Promise<SyncPushResult> {
    const spec = SYNC_SPECS[change.table];
    // O relógio do aparelho só desempata: um adiantado demais não pode ganhar de tudo para sempre.
    const sentAt = new Date(change.updatedAt);
    const updatedAt = sentAt.getTime() > now.getTime() + CLOCK_TOLERANCE_MS ? now : sentAt;

    const parsed =
      change.op === 'delete'
        ? syncDeletePayloadSchema.safeParse(change.payload)
        : spec.schema.safeParse(change.payload);
    if (!parsed.success || parsed.data.id !== change.id) return rejected(change, 'INVALID');

    // Quem manda no id é o primeiro dono: uma linha de outro usuário nunca é lida nem trocada.
    // Para quem pede, é igual a um payload inválido (não revela que o id existe).
    const existing = await session.findMeta(change.table, change.id);
    if (existing && existing.ownerId !== userId) return rejected(change, 'INVALID');
    if (existing && existing.updatedAt.getTime() > updatedAt.getTime()) {
      return rejected(change, 'STALE');
    }

    if (change.op === 'delete') {
      // Excluir o que o servidor nunca viu não tem o que apagar.
      if (!existing) return accepted(change);
      const { deletedAt } = parsed.data as { deletedAt: Date };
      await session.softDelete(change.table, {
        id: change.id,
        deletedAt: deletedAt.getTime() > updatedAt.getTime() ? updatedAt : deletedAt,
        updatedAt,
        version: await session.nextVersion(),
      });
      return accepted(change);
    }

    const payload = parsed.data as never;
    const parents = spec.parents(payload);
    if (parents.vehicleId && !(await this.owns(session, userId, 'vehicles', parents.vehicleId))) {
      return rejected(change, 'PARENT_MISSING');
    }
    if (
      parents.planId &&
      !(await this.owns(session, userId, 'maintenance_plans', parents.planId))
    ) {
      return rejected(change, 'PARENT_MISSING');
    }

    await session.upsert(change.table, {
      id: change.id,
      userId,
      data: spec.toData(payload),
      updatedAt,
      version: await session.nextVersion(),
    });
    return accepted(change);
  }

  private async owns(
    session: SyncSession,
    userId: string,
    table: 'vehicles' | 'maintenance_plans',
    id: string,
  ): Promise<boolean> {
    return (await session.findMeta(table, id))?.ownerId === userId;
  }
}
