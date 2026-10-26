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

// Login com Google: o client ID web é o `aud` do id_token que a API confere; o do iOS e o esquema
// de URL (`com.googleusercontent.apps.<id>`) vêm do projeto do Google Cloud de cada ambiente.
// O plugin recusa o build do iOS sem o esquema, então só entra quando ele está definido.
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? '';

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
    // "Entrar com Apple" (só no iPhone); exige o recurso ligado no App ID da conta Apple Developer.
    usesAppleSignIn: true,
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
    'expo-apple-authentication',
    // "Falar" na tela Abastecer: microfone e reconhecimento de fala do sistema (docs/05).
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'O Tá em Dia usa o microfone só quando você toca em Falar, para registrar o abastecimento pela voz.',
        speechRecognitionPermission:
          'O que você fala vai ao reconhecimento de fala da Apple para virar texto. O Tá em Dia não guarda o áudio.',
      },
    ],
    // Posto pela localização na tela Abastecer ("durante o uso", C6) e aviso ao chegar no posto
    // ("sempre", opcional e desligado por padrão, C7). Geofences do sistema: sem GPS contínuo, sem
    // `UIBackgroundModes: location` e sem serviço em primeiro plano no Android (docs/03 e docs/05).
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'O Tá em Dia usa a localização na tela Abastecer, para sugerir o posto onde você está, e no aviso ao chegar no posto, se você ligar. Ela fica no celular.',
        locationAlwaysAndWhenInUsePermission:
          'Com o aviso ao chegar no posto ligado, o Tá em Dia percebe quando você para num posto e lembra de registrar o abastecimento, mesmo com o app fechado. A localização fica no celular.',
        locationAlwaysPermission: false,
        motionUsagePermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
    ...(googleIosUrlScheme
      ? [
          ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as [
            string,
            { iosUrlScheme: string },
          ],
        ]
      : []),
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
    googleWebClientId,
    googleIosClientId,
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '',
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  },
};

export default config;
