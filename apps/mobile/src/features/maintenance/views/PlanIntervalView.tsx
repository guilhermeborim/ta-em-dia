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
  OwnBadge,
  size,
  spacing,
  Text,
  TextField,
} from '../../../ui';
import { usePlanIntervalViewModel } from '../viewmodels/usePlanIntervalViewModel';

/** Tela 11c: editar o intervalo (km e/ou meses; os dois vazios = só histórico). */
export function PlanIntervalView() {
  const vm = usePlanIntervalViewModel();

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
              Editar intervalo
            </Text>
          </View>

          {vm.notFound ? (
            <EmptyState
              icon="wrench"
              title="Item não encontrado"
              text="Esse item do plano não existe mais."
              actionLabel="Fechar"
              onAction={vm.close}
            />
          ) : (
            <>
              <View style={styles.name}>
                <Text variant="h3">{vm.title}</Text>
                {vm.own ? <OwnBadge /> : null}
              </View>
              <Text variant="body" color="text2">
                Escolha quando avisar. Os dois campos são opcionais.
              </Text>

              <TextField
                label="A cada (km) · opcional"
                suffix="km"
                error={vm.errors.km}
                value={vm.form.km}
                onChangeText={vm.setKm}
                placeholder="10.000"
                keyboardType="number-pad"
              />
              <TextField
                label="A cada (meses) · opcional"
                suffix="meses"
                error={vm.errors.months}
                value={vm.form.months}
                onChangeText={vm.setMonths}
                placeholder="12"
                keyboardType="number-pad"
                maxLength={3}
              />

              <InfoBanner
                icon="bell"
                text="Vale o que vencer primeiro. Com os dois vazios, o item só guarda o histórico, sem alerta."
              />
            </>
          )}
        </ScrollView>

        {vm.notFound ? null : (
          <View style={styles.footer}>
            <Button label="Salvar intervalo" onPress={vm.save} loading={vm.busy} />
            <Button
              label="Remover intervalo"
              variant="ghost"
              onPress={vm.remove}
              disabled={vm.busy}
            />
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
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
});
