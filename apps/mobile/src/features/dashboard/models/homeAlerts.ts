import { buildAlertCards, type PlanCardView } from '../../../core/maintenance';
import type { HomeState } from './home.repository';

/** Quantos alertas o Início mostra (o resto fica na aba Manutenção, em "Ver todos"). */
export const HOME_ALERTS_LIMIT = 2;

export interface HomeAlerts {
  /** Itens perto de vencer ou vencidos, o que vence primeiro no topo. */
  cards: PlanCardView[];
  /** Há algum lembrete ativo (plano ativo com intervalo)? Sem isso, o Início convida a ativar. */
  hasReminders: boolean;
}

/**
 * "Próximos alertas" do Início: só o que está perto de vencer (80% do intervalo ou mais)
 * ou vencido, no máximo `HOME_ALERTS_LIMIT`. Itens em dia e itens só de histórico não entram.
 */
export function buildHomeAlerts(state: HomeState, today: Date = new Date()): HomeAlerts {
  const reminders = state.plans.filter(
    (plan) => plan.enabled && (plan.intervalKm || plan.intervalMonths),
  );
  const cards = buildAlertCards(
    reminders,
    { currentKm: state.vehicle?.currentKm ?? 0, dailyKm: state.dailyKm },
    today,
  )
    .filter((card) => card.tone !== 'ok')
    .slice(0, HOME_ALERTS_LIMIT);

  return { cards, hasReminders: reminders.length > 0 };
}
