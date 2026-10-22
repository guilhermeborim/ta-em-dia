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
  EmptyState,
  Icon,
  NumberField,
  size,
  spacing,
  SwitchRow,
  Text,
  TextField,
} from '../../../ui';
import { useNewFuelEntryViewModel } from '../viewmodels/useNewFuelEntryViewModel';

/** Tela 9: novo abastecimento (e 9b, com tanque cheio marcado). */
export function NewFuelEntryView() {
  const vm = useNewFuelEntryViewModel();

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
              Novo abastecimento
            </Text>
          </View>

          {vm.vehicle ? (
            <>
              <View style={styles.chips}>
                <Chip label={vm.dateLabel} icon="calendar" />
                <Chip label={vm.vehicle.name} icon="car" />
              </View>

              <View style={styles.chips}>
                {vm.fuelTypes.map((item) => (
                  <Chip
                    key={item.type}
                    label={item.label}
                    selected={vm.form.fuelType === item.type}
                    onPress={() => vm.setFuelType(item.type)}
                  />
                ))}
              </View>

              <View style={styles.tip}>
                <Icon name="sparkles" size={18} color={colors.primary} />
                <Text variant="small" color="primary" style={styles.flex}>
                  Preencha 2 valores, a gente calcula o terceiro.
                </Text>
              </View>

              <View style={styles.pair}>
                <View style={styles.flex}>
                  <TextField
                    label="Preço por litro"
                    suffix="/L"
                    value={vm.amounts.pricePerLiter}
                    onChangeText={vm.setPricePerLiter}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Litros"
                    suffix="L"
                    value={vm.amounts.liters}
                    onChangeText={vm.setLiters}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <NumberField
                label={vm.amounts.calculated === 'total' ? 'Total pago · calculado' : 'Total pago'}
                prefix="R$"
                error={vm.errors.amounts}
                value={vm.amounts.total}
                onChangeText={vm.setTotal}
                placeholder="0,00"
              />

              <TextField
                label={vm.kmLabel}
                required
                error={vm.errors.km}
                suffix="km"
                value={vm.form.km}
                onChangeText={vm.setKm}
                placeholder="0"
                keyboardType="number-pad"
              />

              <SwitchRow
                label="Tanque cheio"
                hint="Opcional"
                value={vm.form.fullTank}
                onValueChange={vm.setFullTank}
              />
              <Text variant="small" color="text2">
                {vm.fullTankHelp}
              </Text>

              <TextField
                label="Posto (opcional)"
                value={vm.form.station}
                onChangeText={vm.setStation}
                placeholder="Ex.: Posto Ipiranga"
                autoCapitalize="words"
                maxLength={80}
              />
            </>
          ) : (
            <EmptyState
              icon="car"
              title="Cadastre seu veículo"
              text="Com um veículo cadastrado, você já pode registrar abastecimentos."
              actionLabel="Cadastrar veículo"
              onAction={vm.addVehicle}
            />
          )}
        </ScrollView>

        {vm.vehicle ? (
          <View style={styles.footer}>
            <Button label="Salvar abastecimento" onPress={vm.save} loading={vm.busy} />
          </View>
        ) : null}
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
    gap: 10,
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
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  pair: { flexDirection: 'row', gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
