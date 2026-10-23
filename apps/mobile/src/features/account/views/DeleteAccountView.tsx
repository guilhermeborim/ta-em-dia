import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, radius, spacing, Text, TextField, Toast, TopBar } from '../../../ui';
import { useDeleteAccountViewModel } from '../viewmodels/useDeleteAccountViewModel';

/**
 * Tela 22: Excluir conta. Mostra o que será apagado e só libera o botão depois de digitar EXCLUIR.
 * Sem frame de erro no Figma: falhas aparecem num aviso e nada é apagado.
 */
export function DeleteAccountView() {
  const vm = useDeleteAccountViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <TopBar title="Excluir conta" onBack={vm.cancel} />

        {vm.loading ? null : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconBox}>
                <Icon name="trash" size={34} color={colors.danger} />
              </View>
              <Text variant="h1">Tem certeza? Isso não tem volta.</Text>
              <Text variant="body" color="text2">
                Vamos apagar da nuvem e deste celular:
              </Text>
              <View style={styles.card}>
                {vm.summary.map((line) => (
                  <View key={line} style={styles.line}>
                    <Icon name="close" size={18} color={colors.danger} />
                    <Text variant="body" style={styles.flex}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
              <TextField
                label={`Digite ${vm.confirmWord} para confirmar`}
                value={vm.confirmation}
                onChangeText={vm.setConfirmation}
                placeholder={vm.confirmWord}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </ScrollView>

            <View style={styles.actions}>
              <Button
                label="Excluir minha conta"
                variant="danger"
                disabled={!vm.canDelete}
                loading={vm.busy}
                onPress={vm.remove}
              />
              <Button label="Cancelar" variant="ghost" disabled={vm.busy} onPress={vm.cancel} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {vm.toast ? (
        <View style={styles.toast}>
          <Toast title={vm.toast.title} message={vm.toast.message} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: 14 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  card: {
    gap: 10,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 60 },
});
