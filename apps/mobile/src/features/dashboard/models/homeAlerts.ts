import { DOCUMENT_LABELS, parseDueDate } from '@ta-em-dia/shared';
import { documentSoonDays, statusOfDocument } from '../../../core/documents';
import { toDateInput } from '../../../core/format';
import { buildAlertCards, type PlanCardView } from '../../../core/maintenance';
import type { IconName } from '../../../ui';
import type { HomeState } from './home.repository';

/** Quantos alertas o Início mostra (o resto fica na aba Manutenção, em "Ver todos"). */
export const HOME_ALERTS_LIMIT = 2;

/** Cartão do Início: item de manutenção ou prazo de documento. */
export type HomeAlertCard = PlanCardView & {
  kind: 'plan' | 'document';
  icon: IconName;
};

export interface HomeAlerts {
  /** Itens perto de vencer ou vencidos, vencidos primeiro. */
  cards: HomeAlertCard[];
  /** Há algum lembrete ativo (plano ativo com intervalo)? Sem isso, o Início convida a ativar. */
  hasReminders: boolean;
}

const documentIcons = {
  ipva: 'file',
  licensing: 'shield',
  insurance: 'shield',
  cnh: 'id',
} as const;
const tones = { soon: 'warning', overdue: 'danger' } as const;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Prazos de documentos vencidos ou perto de vencer, os que vencem primeiro no topo. */
function documentCards(state: HomeState, today: Date): HomeAlertCard[] {
  return state.documents
    .map((document) => ({ document, status: statusOfDocument(document, today) }))
    .filter(({ status }) => status.tone !== 'ok')
    .sort((a, b) => a.status.daysLeft - b.status.daysLeft)
    .map(({ document, status }) => {
      const overdue = status.tone === 'overdue';
      const tone = tones[status.tone as 'soon' | 'overdue'];
      const label = DOCUMENT_LABELS[document.kind];
      const date = toDateInput(parseDueDate(document.dueDate)!);
      const days = Math.abs(status.daysLeft);
      return {
        id: document.id,
        kind: 'document' as const,
        icon: documentIcons[document.kind],
        title: label,
        subtitle: `${overdue ? 'Venceu' : 'Vence'} em ${date}`,
        tone,
        status: overdue
          ? 'Vencido'
          : status.daysLeft === 0
            ? 'Hoje'
            : plural(status.daysLeft, 'dia', 'dias'),
        progress: overdue ? 1 : 1 - status.daysLeft / documentSoonDays(document),
        progressLabel: overdue
          ? `Venceu há ${plural(days, 'dia', 'dias')}`
          : status.daysLeft === 0
            ? 'Vence hoje'
            : `Faltam ${plural(days, 'dia', 'dias')}`,
        hint: overdue ? 'Toque para resolver' : 'Toque para ver',
      };
    });
}

/**
 * "Próximos alertas" do Início: o que está perto de vencer (80% do intervalo ou mais, para a
 * manutenção; dentro do aviso, para documentos) ou vencido, no máximo `HOME_ALERTS_LIMIT`.
 * Itens em dia e itens só de histórico não entram. Vencidos vêm antes dos que estão perto.
 */
export function buildHomeAlerts(state: HomeState, today: Date = new Date()): HomeAlerts {
  const reminders = state.plans.filter(
    (plan) => plan.enabled && (plan.intervalKm || plan.intervalMonths),
  );
  const planCards: HomeAlertCard[] = buildAlertCards(
    reminders,
    { currentKm: state.vehicle?.currentKm ?? 0, dailyKm: state.dailyKm },
    today,
  )
    .filter((card) => card.tone !== 'ok')
    .map((card) => ({ ...card, kind: 'plan' as const, icon: 'wrench' as const }));

  // Ordem estável: vencidos antes dos que estão perto; manutenção antes de documento no empate.
  const severity = (card: HomeAlertCard) => (card.tone === 'danger' ? 0 : 1);
  const cards = [...planCards, ...documentCards(state, today)]
    .sort((a, b) => severity(a) - severity(b))
    .slice(0, HOME_ALERTS_LIMIT);

  return { cards, hasReminders: reminders.length > 0 };
}
