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

const config: ExpoConfig = {
  name: variant.name,
  slug: 'ta-em-dia',
  scheme: 'taemdia',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: variant.id,
    supportsTablet: false,
  },
  android: {
    package: variant.id,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  plugins: ['expo-router', 'expo-sqlite', 'expo-secure-store'],
  extra: {
    appEnv: APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
};

export default config;
