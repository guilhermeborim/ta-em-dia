import type { ExpoConfig } from 'expo/config';

type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

// Cada ambiente é um app separado no celular (nome e identificador próprios).
const variants: Record<AppEnv, { name: string; id: string }> = {
  development: { name: 'Tá em Dia (Dev)', id: 'com.guilhermeborim.taemdia.dev' },
  staging: { name: 'Tá em Dia (Staging)', id: 'com.guilhermeborim.taemdia.staging' },
  production: { name: 'Tá em Dia', id: 'com.guilhermeborim.taemdia' },
};

const variant = variants[APP_ENV];

// Roxo da marca: fundo da splash e do ícone adaptativo do Android.
const PURPLE = '#4637EB';

const config: ExpoConfig = {
  name: variant.name,
  slug: 'ta-em-dia',
  scheme: 'taemdia',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: variant.id,
    supportsTablet: false,
  },
  android: {
    package: variant.id,
    adaptiveIcon: {
      backgroundColor: PURPLE,
      foregroundImage: './assets/images/adaptive-icon.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    'expo-notifications',
    'expo-updates',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        backgroundColor: PURPLE,
      },
    ],
  ],
  owner: 'guiborim',
  updates: { url: 'https://u.expo.dev/ccd0ca56-3132-4ae9-b6e0-b6e858af14cb' },
  runtimeVersion: { policy: 'appVersion' },
  extra: {
    eas: { projectId: 'ccd0ca56-3132-4ae9-b6e0-b6e858af14cb' },
    appEnv: APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
};

export default config;
