import {
  DOCUMENT_LABELS,
  documentReminders,
  isVehicleDocument,
  lateDocumentReminder,
  type DocumentKind,
} from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../db';
import {
  reminderScheduler,
  type ReminderNotification,
  type ReminderScheduler,
} from '../notifications';
import { loadSettings } from '../settings';
import { listAllDocuments, type DocumentWithVehicle } from './documents.repository';

/** Prefixo dos ids dos avisos de documentos (`document:<id>:<dias>` ou `document:<id>:late`). */
export const DOCUMENT_REMINDER_PREFIX = 'document:';

const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** "IPVA do Gol vence em 10 dias", "Sua CNH vence hoje" (docs/02-telas-e-fluxos.md). */
function body(kind: DocumentKind, vehicleName: string, daysLeft: number): string {
  const label = isVehicleDocument(kind)
    ? `${DOCUMENT_LABELS[kind]} do ${vehicleName}`
    : `Sua ${DOCUMENT_LABELS[kind]}`;
  return daysLeft === 0 ? `${label} vence hoje` : `${label} vence em ${days(daysLeft)}`;
}

/** O ciclo do prazo: muda quando a data ou os dias de aviso mudam. */
const cycleKey = (document: DocumentWithVehicle) =>
  `${document.dueDate}|${[...document.notifyDays].sort((a, b) => b - a).join(',')}`;
const notifiedKey = (documentId: string) => `doc_notified:${documentId}`;

/**
 * O que ficou guardado do prazo no ciclo atual: `armed` (os avisos normais foram agendados) ou
 * o aviso atrasado (cadastrado já dentro da janela) com a hora dele.
 */
async function readNotified(
  db: Db,
  document: DocumentWithVehicle,
): Promise<{ armed: boolean; lateAt: Date | null }> {
  const stored = await getSetting(db, notifiedKey(document.id));
  const none = { armed: false, lateAt: null };
  if (!stored) return none;
  const [cycle, kind, at] = stored.split('#');
  if (cycle !== cycleKey(document)) return none;
  return kind === 'late' ? { armed: false, lateAt: new Date(at) } : { armed: true, lateAt: null };
}

/**
 * Reagenda os avisos de vencimento (notificações locais) dos veículos ativos e da CNH: um por
 * dia de antecedência de cada prazo, às 9h. Troca todos os avisos de documentos antigos pelos
 * novos. Chame depois de mudar um prazo, e ao abrir o app ou voltar a ele. Sem permissão não
 * agenda nada (e não pede). Com os avisos de documentos desligados em Configurações, só cancela
 * os antigos. Nunca lança erro.
 *
 * Prazo que já passou de algum aviso mas ainda não venceu (cadastrado faltando 10 dias, com aviso
 * de 30) avisa uma vez, no próximo 9h, igual à manutenção; mudar a data ou os dias de aviso
 * libera um novo aviso (o que foi agendado fica em `app_settings`, chave `doc_notified:<id>`).
 */
export async function refreshDocumentReminders(
  db: Db,
  opts: { scheduler?: ReminderScheduler; now?: Date } = {},
): Promise<void> {
  const scheduler = opts.scheduler ?? reminderScheduler;
  const now = opts.now ?? new Date();

  try {
    // Desligado em Configurações: nada agendado (e o que havia é cancelado).
    const { notifyDocuments } = await loadSettings(db);
    const documents = notifyDocuments ? await listAllDocuments(db) : [];

    const items: ReminderNotification[] = [];
    const records = new Map<string, string>();

    for (const document of documents) {
      const dataFor = {
        documentId: document.id,
        ...(document.vehicleId && { vehicleId: document.vehicleId }),
      };
      const name = document.vehicleName ?? '';
      const regular = documentReminders([document], now);
      for (const reminder of regular) {
        items.push({
          id: `${DOCUMENT_REMINDER_PREFIX}${document.id}:${reminder.daysBefore}`,
          title: 'Tá em Dia',
          body: body(document.kind, name, reminder.daysBefore),
          fireAt: reminder.fireAt,
          data: dataFor,
        });
      }

      const notified = await readNotified(db, document);
      const late = notified.armed ? null : lateDocumentReminder(document, now);
      // Já avisou (ou vai avisar na hora guardada): só repete se o aviso ainda não chegou.
      const pending = notified.lateAt && notified.lateAt > now;
      if (late && (!notified.lateAt || pending)) {
        items.push({
          id: `${DOCUMENT_REMINDER_PREFIX}${document.id}:late`,
          title: 'Tá em Dia',
          body: body(document.kind, name, late.daysLeft),
          fireAt: late.fireAt,
          data: dataFor,
        });
        records.set(document.id, `${cycleKey(document)}#late#${late.fireAt.toISOString()}`);
      } else if (!notified.lateAt && !notified.armed && regular.length > 0) {
        records.set(document.id, `${cycleKey(document)}#armed`);
      }
    }

    items.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
    const scheduled = await scheduler.replaceScheduled(DOCUMENT_REMINDER_PREFIX, items);
    if (scheduled) {
      for (const [id, value] of records) await setSetting(db, notifiedKey(id), value);
    }
  } catch {
    // Aviso é um extra: erro aqui não pode atrapalhar quem salvou um prazo.
  }
}
