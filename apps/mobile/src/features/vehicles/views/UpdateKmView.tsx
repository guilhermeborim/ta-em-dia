import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  EmptyState,
  Icon,
  InfoBanner,
  size,
  spacing,
  Text,
  TextField,
} from '../../../ui';
import { useUpdateKmViewModel } from '../viewmodels/useUpdateKmViewModel';

/** Atualizar km (aberto pelo detalhe do veículo): o km do painel vira uma leitura do hodômetro. */
export function UpdateKmView() {
  const vm = useUpdateKmViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={vm.close}
              style={styles.close}
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
            <Text variant="h2" style={styles.flex}>
              Atualizar km
            </Text>
          </View>

          {vm.notFound ? (
            <EmptyState
              icon="car"
              title="Veículo não encontrado"
              text="Esse veículo não existe mais."
              actionLabel="Fechar"
              onAction={vm.close}
            />
          ) : (
            <>
              <Text variant="body" color="text2">
                {vm.name}: confira o km no painel e digite aqui.
              </Text>
              <TextField
                label="Km no painel"
                required
                suffix="km"
                error={vm.error}
                value={vm.km}
                onChangeText={vm.setKm}
                placeholder="0"
                keyboardType="number-pad"
                autoFocus
              />
              <InfoBanner
                icon="bell"
                text="Os avisos de manutenção e a média diária usam esse km."
              />
            </>
          )}
        </ScrollView>

        {vm.notFound ? null : (
          <View style={styles.footer}>
            <Button label="Salvar km" onPress={vm.save} loading={vm.busy} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
