import { reminderScheduler, type ReminderScheduler } from '../notifications';

/** Prefixo dos avisos de rascunho que versões anteriores do app agendaram (`fuel-draft:<id>:<n>`). */
const LEGACY_FUEL_DRAFT_PREFIX = 'fuel-draft:';

/**
 * O app não tem mais rascunho de abastecimento: cancela os avisos que uma versão anterior deixou
 * agendados no aparelho. Sem aviso agendado, não faz nada.
 */
export async function cancelLegacyFuelDraftReminders(
  scheduler: ReminderScheduler = reminderScheduler,
): Promise<void> {
  await scheduler.replaceScheduled(LEGACY_FUEL_DRAFT_PREFIX, []);
}
