import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DatabaseProvider } from '../core/db';

// Mantém a splash até o banco local estar pronto.
SplashScreen.preventAutoHideAsync();

/** Só é renderizado depois que o DatabaseProvider abriu o SQLite e rodou as migrations. */
function AppReady() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppReady />
    </DatabaseProvider>
  );
}
