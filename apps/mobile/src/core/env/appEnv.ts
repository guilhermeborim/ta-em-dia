import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';

interface AppExtra {
  appEnv?: AppEnv;
  apiUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

/** Ambiente e URL da API deste build (definidos em app.config.ts / eas.json). */
export const appEnv: AppEnv = extra.appEnv ?? 'development';
export const apiUrl: string = extra.apiUrl ?? 'http://localhost:3000';
/** Client IDs do Google deste ambiente (vazios quando o build não tem o login do Google). */
export const googleWebClientId: string = extra.googleWebClientId ?? '';
export const googleIosClientId: string = extra.googleIosClientId ?? '';
