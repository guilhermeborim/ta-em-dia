import { colors, type IconName } from '../../../ui';

export interface NoticeItem {
  icon: IconName;
  title: string;
  text: string;
  background: string;
  color: string;
}

export const noticeItems: NoticeItem[] = [
  {
    icon: 'check',
    title: 'Funciona 100% offline',
    text: 'Anote abastecimentos até sem sinal no posto',
    background: colors.successSoft,
    color: colors.success,
  },
  {
    icon: 'alert',
    title: 'Trocou de celular? Os dados não vão junto',
    text: 'Se apagar o app, perde o histórico',
    background: colors.warningSoft,
    color: colors.warning,
  },
  {
    icon: 'cloud',
    title: 'Dá pra salvar numa conta depois',
    text: 'Em Mais → Conta, quando quiser',
    background: colors.primarySoft,
    color: colors.primary,
  },
];
