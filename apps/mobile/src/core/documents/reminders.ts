import {
  DOCUMENT_LABELS,
  documentReminders,
  isVehicleDocument,
  type DocumentKind,
} from '@ta-em-dia/shared';
import type { Db } from '../db';
import {
  reminderScheduler,
  type ReminderNotification,
  type ReminderScheduler,
} from '../notifications';
import { loadSettings } from '../settings';
import { findActiveVehicle } from '../vehicle';
import { listDocuments } from './documents.repository';

/** Prefixo dos ids dos avisos de documentos (`document:<id>:<dias>`). */
export const DOCUMENT_REMINDER_PREFIX = 'document:';

const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** "IPVA do Gol vence em 10 dias", "Sua CNH vence em 30 dias" (docs/02-telas-e-fluxos.md). */
function body(kind: DocumentKind, vehicleName: string, daysBefore: number): string {
  const label = isVehicleDocument(kind)
    ? `${DOCUMENT_LABELS[kind]} do ${vehicleName}`
    : `Sua ${DOCUMENT_LABELS[kind]}`;
  return `${label} vence em ${days(daysBefore)}`;
}

/**
 * Reagenda os avisos de vencimento (notificações locais) do veículo ativo e da CNH: um por dia
 * de antecedência de cada prazo, às 9h. Troca todos os avisos de documentos antigos pelos novos.
 * Chame depois de mudar um prazo, e ao abrir o app ou voltar a ele. Sem permissão não agenda
 * nada (e não pede). Com os avisos de documentos desligados em Configurações, só cancela os
 * antigos. Nunca lança erro.
 */
export async function refreshDocumentReminders(
  db: Db,
  opts: { scheduler?: ReminderScheduler; now?: Date } = {},
): Promise<void> {
  const scheduler = opts.scheduler ?? reminderScheduler;
  const now = opts.now ?? new Date();

  try {
    const vehicle = await findActiveVehicle(db);
    // Desligado em Configurações: nada agendado (e o que havia é cancelado).
    const { notifyDocuments } = await loadSettings(db);
    const documents = notifyDocuments ? await listDocuments(db, vehicle?.id) : [];

    const items: ReminderNotification[] = documentReminders(documents, now).map((reminder) => ({
      id: `${DOCUMENT_REMINDER_PREFIX}${reminder.documentId}:${reminder.daysBefore}`,
      title: 'Tá em Dia',
      body: body(reminder.kind, vehicle?.name ?? '', reminder.daysBefore),
      fireAt: reminder.fireAt,
      data: { documentId: reminder.documentId },
    }));

    await scheduler.replaceScheduled(DOCUMENT_REMINDER_PREFIX, items);
  } catch {
    // Aviso é um extra: erro aqui não pode atrapalhar quem salvou um prazo.
  }
}
