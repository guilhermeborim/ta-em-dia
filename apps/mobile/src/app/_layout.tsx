import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAnonymousSession } from '../core/auth';
import { DatabaseProvider } from '../core/db';
import { useReminderLifecycle } from '../core/reminders';
// Define a tarefa das geofences do aviso ao chegar no posto (precisa existir antes de tudo).
import '../core/stationArrival/task';
import { useSyncLifecycle } from '../core/sync';
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

  // Avisos de manutenção: reagenda ao abrir e ao voltar ao app; tocar num aviso abre o item.
  useReminderLifecycle(ready && done === true && loginDone === true);

  // Usuário anônimo na API: só tenta depois do "Continuar sem login"; o app funciona sem ele.
  useAnonymousSession(ready && done === true && loginDone === true);

  // Sync com a API: liga com o resto, mas só roda para quem as flags `sync.*` liberam.
  useSyncLifecycle(ready && done === true && loginDone === true);

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
      <Stack.Protected guard={done === true}>
        <Stack.Screen name="primeiro-veiculo" />
      </Stack.Protected>
      <Stack.Protected guard={done === true}>
        <Stack.Screen name="permissao-notificacoes" />
      </Stack.Protected>
      <Stack.Protected guard={done === true && loginDone === true}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="novo-abastecimento" options={{ presentation: 'modal' }} />
        <Stack.Screen name="abastecimento/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="registrar-manutencao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="historico" />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="veiculos" />
        <Stack.Screen name="conta" />
        <Stack.Screen name="excluir-conta" />
        <Stack.Screen name="configuracoes" />
        <Stack.Screen name="configuracoes/antecedencia" options={{ presentation: 'modal' }} />
        <Stack.Screen name="configuracoes/aviso-no-posto" options={{ presentation: 'modal' }} />
        <Stack.Screen name="alertas" />
        <Stack.Screen name="documentos" />
        <Stack.Screen name="documento/novo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="documento/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="veiculo/[id]" />
        <Stack.Screen name="veiculo/[id]/editar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="veiculo/[id]/atualizar-km" options={{ presentation: 'modal' }} />
        <Stack.Screen name="novo-veiculo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plano-manutencao/[id]" />
        <Stack.Screen name="plano-manutencao/[id]/editar" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // Os gestos (arrastar para reordenar) precisam desta raiz.
    <GestureHandlerRootView style={styles.root}>
      <DatabaseProvider>
        <OnboardingProvider>
          <LoginProvider>
            <AppReady />
          </LoginProvider>
        </OnboardingProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
