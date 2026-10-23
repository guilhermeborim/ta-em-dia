import type { SocialProvider } from '@ta-em-dia/shared';
import type { DeleteAccountResult } from '../../../core/auth/accountFlow';
import { providerLabel } from '../../../core/auth';
import { recordsText, vehiclesText, type LocalData } from './account.model';

/** Palavra que a pessoa digita para liberar "Excluir minha conta". */
export const CONFIRM_WORD = 'EXCLUIR';

/** Vale "excluir", "EXCLUIR" ou com espaços nas pontas; qualquer outra coisa não libera. */
export const isDeleteConfirmed = (text: string): boolean =>
  text.trim().toUpperCase() === CONFIRM_WORD;

/** As linhas do cartão "Vamos apagar da nuvem e deste celular". */
export function deleteSummary(
  local: Pick<LocalData, 'vehicles' | 'records'>,
  provider: SocialProvider,
): string[] {
  return [
    vehiclesText(local.vehicles),
    `${recordsText(local.records)} de abastecimento e manutenção`,
    'Lembretes e prazos de documentos',
    `Sua conta ${providerLabel(provider)} vinculada ao app`,
  ];
}

/** Aviso quando não deu para excluir; `done` não avisa nada (o app volta ao Login). */
export function deleteFailureMessage(result: Exclude<DeleteAccountResult, 'done'>): string {
  return result === 'retry'
    ? 'Sem conexão com o servidor. Nada foi apagado. Tente de novo em instantes.'
    : 'Não foi possível excluir a conta agora. Nada foi apagado. Tente de novo.';
}
