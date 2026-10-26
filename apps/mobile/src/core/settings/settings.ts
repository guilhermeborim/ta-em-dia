import { DEFAULT_DOCUMENT_NOTIFY_DAYS, DOCUMENT_NOTIFY_OPTIONS } from '@ta-em-dia/shared';
import { getSetting, setSetting, type Db } from '../db';

/** Preferências da tela Configurações. Ficam só no aparelho (`app_settings`), sem sync. */
export interface AppSettings {
  /** Avisos de manutenção (padrão: ligado). */
  notifyMaintenance: boolean;
  /** Avisos de vencimento de documentos (padrão: ligado). */
  notifyDocuments: boolean;
  /** Lembrete de atualizar o km a cada 7 dias (padrão: desligado). */
  notifyOdometer: boolean;
  /** Antecedência dos prazos novos, em dias, do maior para o menor (padrão: 30 e 7). */
  documentNotifyDays: number[];
  /** Falar um abastecimento completo e válido já salva (padrão: desligado; senão só preenche). */
  voiceAutoSave: boolean;
}

const KEYS = {
  notifyMaintenance: 'settings.notify_maintenance',
  notifyDocuments: 'settings.notify_documents',
  notifyOdometer: 'settings.notify_odometer',
  documentNotifyDays: 'settings.document_notify_days',
  voiceAutoSave: 'settings.voice_auto_save',
} as const;

export type NotifySetting = 'notifyMaintenance' | 'notifyDocuments' | 'notifyOdometer';
export type ToggleSetting = NotifySetting | 'voiceAutoSave';

/** "30,7" → [30, 7]. Ignora o que não é uma opção válida; sem nada válido, volta ao padrão. */
export function parseNotifyDays(text: string | null): number[] {
  const days = (text ?? '')
    .split(',')
    .map(Number)
    .filter((day) => DOCUMENT_NOTIFY_OPTIONS.includes(day));
  const unique = [...new Set(days)].sort((a, b) => b - a);
  return unique.length > 0 ? unique : [...DEFAULT_DOCUMENT_NOTIFY_DAYS];
}

const readFlag = async (db: Db, key: string, fallback: boolean): Promise<boolean> => {
  const value = await getSetting(db, key);
  return value === null ? fallback : value === '1';
};

export async function loadSettings(db: Db): Promise<AppSettings> {
  return {
    notifyMaintenance: await readFlag(db, KEYS.notifyMaintenance, true),
    notifyDocuments: await readFlag(db, KEYS.notifyDocuments, true),
    notifyOdometer: await readFlag(db, KEYS.notifyOdometer, false),
    documentNotifyDays: parseNotifyDays(await getSetting(db, KEYS.documentNotifyDays)),
    voiceAutoSave: await readFlag(db, KEYS.voiceAutoSave, false),
  };
}

export async function saveToggle(db: Db, key: ToggleSetting, value: boolean): Promise<void> {
  await setSetting(db, KEYS[key], value ? '1' : '0');
}

/** Guarda a antecedência padrão dos prazos novos (do maior para o menor). */
export async function saveDocumentNotifyDays(db: Db, days: number[]): Promise<void> {
  await setSetting(db, KEYS.documentNotifyDays, parseNotifyDays(days.join(',')).join(','));
}
