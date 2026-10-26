/** Um aviso local a agendar. */
export interface ReminderNotification {
  /** Identificador estável: agendar de novo com o mesmo id troca o aviso anterior. */
  id: string;
  title: string;
  body: string;
  /** Quando o aviso aparece. Sempre no futuro. */
  fireAt: Date;
  /** Volta no toque do aviso (ver `onNotificationOpened`). */
  data:
    | { planId: string }
    | { documentId: string; vehicleId?: string }
    | { fuelDraftId: string }
    | { vehicleId: string };
}

export interface ReminderScheduler {
  /**
   * Troca os avisos agendados cujo id começa com `prefix` pelos de `items` (cancela os antigos).
   * Só age se a permissão de notificações já foi dada; nunca pede a permissão. Nunca lança erro.
   * Devolve `true` se os avisos foram agendados, `false` se não deu (sem permissão, sem suporte
   * na plataforma ou falha do sistema).
   */
  replaceScheduled(prefix: string, items: ReminderNotification[]): Promise<boolean>;
}

/** Dados que o aviso carrega, entregues ao tocar nele. */
export type NotificationOpenedData = Record<string, unknown>;
