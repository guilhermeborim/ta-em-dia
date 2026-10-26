import type { LocationPermission } from '../../../core/location';

/**
 * Telas que explicam o aviso ao chegar no posto antes dos pedidos do sistema (exigência do Google,
 * "prominent disclosure"): primeiro o que é e o "durante o uso", depois o "sempre".
 */
export type ArrivalSetupStep =
  /** O que é o aviso, bateria e privacidade; "Continuar" pede o "durante o uso". */
  | 'intro'
  /** Explica o "sempre" antes do pedido do sistema. */
  | 'always'
  /** Recusou: só nos ajustes do aparelho. */
  | 'denied'
  /** Aviso ligado, mas as notificações do app estão desativadas. */
  | 'notifications'
  /** Build sem os módulos nativos. */
  | 'unavailable';

/** Depois do pedido do "durante o uso". Fechar o pedido sem escolher volta ao começo. */
export function stepAfterForeground(permission: LocationPermission): ArrivalSetupStep {
  if (permission === 'granted') return 'always';
  if (permission === 'unavailable') return 'unavailable';
  return permission === 'denied' ? 'denied' : 'intro';
}

/** Depois do pedido do "sempre": `enable` liga o aviso. */
export function stepAfterBackground(permission: LocationPermission): ArrivalSetupStep | 'enable' {
  if (permission === 'granted') return 'enable';
  if (permission === 'unavailable') return 'unavailable';
  return permission === 'denied' ? 'denied' : 'always';
}

export interface ArrivalSetupContent {
  title: string;
  text: string;
  bullets: string[];
  primary: string;
  /** Sem texto, não há segundo botão. */
  secondary?: string;
}

/** Exemplo do aviso na ilustração (o mesmo texto do aviso de verdade). */
export const ARRIVAL_SAMPLE = {
  title: 'Abastecendo no Shell · Av. da Pista?',
  text: 'Registre agora.',
} as const;

export function arrivalSetupContent(step: ArrivalSetupStep, platform: string): ArrivalSetupContent {
  const ios = platform === 'ios';
  switch (step) {
    case 'intro':
      return {
        title: 'Aviso ao chegar no posto',
        text: 'Quando você para uns 2 minutos num posto, o app lembra de registrar o abastecimento.',
        bullets: [
          'Usa a localização mesmo com o app fechado, só para perceber a chegada a um posto. Ela não sai do celular e o app não guarda por onde você passa.',
          'Gasta pouca bateria: o celular só chama o app perto de um posto.',
          'No máximo um aviso por posto a cada 12 horas, e nenhum se você já registrou um abastecimento hoje.',
          'Você desliga quando quiser em Configurações.',
        ],
        primary: 'Continuar',
        secondary: 'Agora não',
      };
    case 'always':
      return {
        title: 'Permita a localização o tempo todo',
        text: ios
          ? 'Para avisar com o app fechado, o iPhone precisa da localização “Sempre”. Na próxima tela, toque em “Mudar para Sempre Permitir”.'
          : 'Para avisar com o app fechado, o Android precisa da localização “Permitir o tempo todo”. Na próxima tela, escolha essa opção e volte ao app.',
        bullets: [],
        primary: 'Continuar',
        secondary: 'Agora não',
      };
    case 'denied':
      return {
        title: 'O aviso precisa da localização',
        text: ios
          ? 'Sem a localização “Sempre”, o app não percebe a chegada ao posto. Você pode permitir nos ajustes do iPhone. O resto do app funciona igual.'
          : 'Sem a localização “Permitir o tempo todo”, o app não percebe a chegada ao posto. Você pode permitir nos ajustes do celular. O resto do app funciona igual.',
        bullets: [],
        primary: 'Abrir ajustes',
        secondary: 'Agora não',
      };
    case 'notifications':
      return {
        title: 'Ative as notificações',
        text: 'O aviso está ligado, mas as notificações do app estão desativadas. Ative nos ajustes do celular para receber o aviso.',
        bullets: [],
        primary: 'Abrir ajustes',
        secondary: 'Fechar',
      };
    case 'unavailable':
      return {
        title: 'Aviso indisponível',
        text: 'Esta versão do app ainda não tem o aviso ao chegar no posto. Atualize o app para usar.',
        bullets: [],
        primary: 'Fechar',
      };
  }
}
