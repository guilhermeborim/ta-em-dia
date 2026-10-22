import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, spacing, Text } from '../../../ui';

/** Tela 4: avisa que, sem login, os dados ficam só no aparelho. */
export function AnonymousNoticeView() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.texts}>
        <Text variant="h1">Seus dados ficam neste aparelho</Text>
        <Text variant="body" color="text2">
          Sem login, tudo fica salvo só aqui. Você pode guardar numa conta depois.
        </Text>
      </View>
      <Button label="Continuar" onPress={() => router.replace('/')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  texts: { gap: spacing.md, paddingTop: 60 },
});
