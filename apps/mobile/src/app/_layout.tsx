import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DatabaseProvider } from '../core/db';
import { fontAssets } from '../ui';

// Mantém a splash até o banco local e as fontes estarem prontos.
SplashScreen.preventAutoHideAsync();

/** Só é renderizado depois que o DatabaseProvider abriu o SQLite e rodou as migrations. */
function AppReady() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Se a fonte falhar, o app abre com a fonte do sistema em vez de travar na splash.
  if (!ready) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppReady />
    </DatabaseProvider>
  );
}
