import type { IconName } from '../../../ui';
import { getSetting, setSetting, type Db } from '../../../core/db';

export interface PremiumFeature {
  icon: IconName;
  title: string;
  subtitle: string;
}

/** Recursos que a tela "Premium em breve" lista (docs/01-roadmap.md); sem preço, sem cobrança. */
export const premiumFeatures: PremiumFeature[] = [
  { icon: 'camera', title: 'Leitura da bomba pela câmera', subtitle: 'Foto do visor e pronto' },
  {
    icon: 'pin',
    title: 'Lembrete ao chegar no posto',
    subtitle: 'Avisa para registrar o abastecimento',
  },
  { icon: 'car', title: 'Veículos ilimitados', subtitle: 'Carro, moto e da família' },
  {
    icon: 'file',
    title: 'Relatório em PDF',
    subtitle: 'Para vender o carro ou a empresa',
  },
  { icon: 'trend-up', title: 'Valor FIPE e multas', subtitle: 'Acompanhe sem sair do app' },
];

const WAITLIST_KEY = 'premium.waitlist';

/** A pessoa já tocou em "Avise-me quando lançar"? Fica só no aparelho (não sincroniza). */
export async function isOnWaitlist(db: Db): Promise<boolean> {
  return (await getSetting(db, WAITLIST_KEY)) === '1';
}

export async function joinWaitlist(db: Db): Promise<void> {
  await setSetting(db, WAITLIST_KEY, '1');
}
