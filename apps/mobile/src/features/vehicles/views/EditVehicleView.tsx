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
import { useEditVehicleViewModel } from '../viewmodels/useEditVehicleViewModel';

/** Editar veículo (aberto pelo lápis do detalhe): dados, arquivar ou restaurar e excluir. */
export function EditVehicleView() {
  const vm = useEditVehicleViewModel();

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
              Editar veículo
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
              <TextField
                label="Marca"
                required
                error={vm.errors.brand}
                value={vm.form.brand}
                onChangeText={vm.setBrand}
                placeholder="Ex.: Volkswagen"
                autoCapitalize="words"
                maxLength={40}
              />
              <TextField
                label="Modelo"
                required
                error={vm.errors.model}
                value={vm.form.model}
                onChangeText={vm.setModel}
                placeholder="Ex.: Gol 1.0 MPI"
                autoCapitalize="words"
                maxLength={60}
              />
              <View style={styles.pair}>
                <View style={styles.flex}>
                  <TextField
                    label="Ano"
                    required
                    error={vm.errors.year}
                    value={vm.form.year}
                    onChangeText={vm.setYear}
                    placeholder="2019"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Apelido"
                    value={vm.form.nickname}
                    onChangeText={vm.setNickname}
                    placeholder="Ex.: Golzinho"
                    maxLength={40}
                  />
                </View>
              </View>
              <TextField
                label="Placa"
                error={vm.errors.plate}
                value={vm.form.plate}
                onChangeText={vm.setPlate}
                placeholder="ABC1D23"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
              />

              <View style={styles.danger}>
                <InfoBanner
                  icon="bell"
                  text={
                    vm.archived
                      ? 'Restaurar põe o veículo de volta no fim de Meus veículos, com os avisos.'
                      : 'Arquivar tira o veículo das listas e dos avisos, e guarda o histórico. Você pode restaurar depois em Meus veículos.'
                  }
                />
                <Button
                  label={vm.archived ? 'Restaurar veículo' : 'Arquivar veículo'}
                  variant="outline"
                  onPress={vm.toggleArchive}
                  disabled={vm.busy}
                />
                <Button
                  label="Excluir veículo"
                  variant="danger"
                  onPress={vm.confirmDelete}
                  disabled={vm.busy}
                />
              </View>
            </>
          )}
        </ScrollView>

        {vm.notFound ? null : (
          <View style={styles.footer}>
            <Button label="Salvar" onPress={vm.save} loading={vm.busy} />
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
    gap: 14,
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
  pair: { flexDirection: 'row', gap: spacing.md },
  danger: { gap: spacing.sm, paddingTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
