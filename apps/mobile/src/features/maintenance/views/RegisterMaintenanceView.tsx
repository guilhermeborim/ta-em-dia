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
  Chip,
  colors,
  DatePicker,
  EmptyState,
  Icon,
  NumberField,
  size,
  spacing,
  Text,
  TextField,
} from '../../../ui';
import { useRegisterMaintenanceViewModel } from '../viewmodels/useRegisterMaintenanceViewModel';

/** Tela 12 (e 12b, com um atalho "Seu" escolhido): registrar uma manutenção feita. */
export function RegisterMaintenanceView() {
  const vm = useRegisterMaintenanceViewModel();

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
              Registrar manutenção
            </Text>
          </View>

          {vm.hasVehicle ? (
            <>
              <Text variant="small" color="text2">
                Tipo
                <Text variant="small" color="danger">
                  {' *'}
                </Text>
              </Text>
              <View style={styles.chips}>
                {vm.options.map((option) => (
                  <Chip
                    key={option.key}
                    label={option.label}
                    own={option.own}
                    selected={vm.form.typeKey === option.key}
                    onPress={() => vm.selectType(option.key)}
                  />
                ))}
              </View>
              {vm.errors.type ? (
                <Text variant="caption" color="danger">
                  {vm.errors.type}
                </Text>
              ) : null}

              {vm.showCustomName ? (
                <View style={styles.customName}>
                  <TextField
                    label="Nome do tipo"
                    required
                    error={vm.errors.customName}
                    value={vm.form.customName}
                    onChangeText={vm.setCustomName}
                    placeholder="Ex.: Troca de bateria"
                    autoCapitalize="sentences"
                    maxLength={60}
                  />
                  <Text variant="small" color="text2">
                    Fica salvo na sua lista como atalho para a próxima vez.
                  </Text>
                </View>
              ) : null}

              <View style={styles.pair}>
                <View style={styles.flex}>
                  <TextField
                    label="Data"
                    required
                    error={vm.errors.date}
                    value={vm.form.date}
                    onChangeText={vm.setDate}
                    placeholder="dd/mm/aaaa"
                    keyboardType="number-pad"
                    maxLength={10}
                    action={{
                      icon: 'calendar',
                      label: 'Abrir calendário',
                      onPress: vm.openDatePicker,
                    }}
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Km"
                    required
                    error={vm.errors.km}
                    suffix="km"
                    value={vm.form.km}
                    onChangeText={vm.setKm}
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <NumberField
                label="Quanto custou"
                prefix="R$"
                value={vm.form.cost}
                onChangeText={vm.setCost}
                placeholder="0,00"
              />

              <TextField
                label="Oficina (opcional)"
                value={vm.form.shop}
                onChangeText={vm.setShop}
                placeholder="Ex.: Auto Center do Zé"
                autoCapitalize="words"
                maxLength={80}
              />
            </>
          ) : (
            <EmptyState
              icon="car"
              title="Cadastre seu veículo"
              text="Com um veículo cadastrado, você já pode registrar manutenções."
              actionLabel="Cadastrar veículo"
              onAction={vm.addVehicle}
            />
          )}
        </ScrollView>

        {vm.hasVehicle ? (
          <View style={styles.footer}>
            <Button label="Salvar manutenção" onPress={vm.save} loading={vm.busy} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
      <DatePicker
        visible={vm.pickerOpen}
        value={vm.pickerValue}
        minimumDate={vm.pickerMin}
        maximumDate={vm.pickerMax}
        onChange={vm.pickDate}
        onClose={vm.closeDatePicker}
      />
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
    gap: 12,
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  customName: { gap: 6 },
  pair: { flexDirection: 'row', gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
