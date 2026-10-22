import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DatabaseProvider } from '../core/db';
import { LoginProvider, useLogin } from '../features/login/LoginProvider';
import { OnboardingProvider, useOnboarding } from '../features/onboarding/OnboardingProvider';
import { fontAssets } from '../ui';

// Mantém a splash até o banco local e as fontes estarem prontos.
SplashScreen.preventAutoHideAsync();

/** Só é renderizado depois que o DatabaseProvider abriu o SQLite e rodou as migrations. */
function AppReady() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { done } = useOnboarding();
  const { done: loginDone } = useLogin();
  const ready = (fontsLoaded || fontError !== null) && done !== null && loginDone !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Se a fonte falhar, o app abre com a fonte do sistema em vez de travar na splash.
  if (!ready) return null;

  // Boas-vindas e Login só na primeira abertura; depois de concluídos, as rotas deixam de existir.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!done}>
        <Stack.Screen name="boas-vindas" />
      </Stack.Protected>
      <Stack.Protected guard={done === true}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={done === true}>
        <Stack.Screen name="aviso-sem-login" />
      </Stack.Protected>
      <Stack.Protected guard={done === true && loginDone === true}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <OnboardingProvider>
        <LoginProvider>
          <AppReady />
        </LoginProvider>
      </OnboardingProvider>
    </DatabaseProvider>
  );
}
