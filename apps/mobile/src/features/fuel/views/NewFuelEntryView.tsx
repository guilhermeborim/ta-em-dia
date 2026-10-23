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
  InfoBanner,
  NumberField,
  size,
  spacing,
  SwitchRow,
  Text,
  TextField,
} from '../../../ui';
import { useNewFuelEntryViewModel } from '../viewmodels/useNewFuelEntryViewModel';

/** Tela 9: novo abastecimento (e 9b, com tanque cheio marcado). */
/** Android: o teclado decimal esconde a vírgula em alguns aparelhos; o numérico mostra. */
const decimalKeyboard = Platform.OS === 'android' ? 'numeric' : 'decimal-pad';

export function NewFuelEntryView() {
  const vm = useNewFuelEntryViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
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
                <Chip label={vm.dateLabel} icon="calendar" onPress={vm.openDatePicker} />
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

              <InfoBanner icon="sparkles" text="Preencha 2 valores, a gente calcula o terceiro." />

              <View style={styles.pair}>
                <View style={styles.flex}>
                  <TextField
                    label="Preço por litro"
                    suffix="/L"
                    value={vm.amounts.pricePerLiter}
                    onChangeText={vm.setPricePerLiter}
                    placeholder="0,00"
                    keyboardType={decimalKeyboard}
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Litros"
                    suffix="L"
                    value={vm.amounts.liters}
                    onChangeText={vm.setLiters}
                    placeholder="0,00"
                    keyboardType={decimalKeyboard}
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
                label="Posto"
                required
                error={vm.errors.station}
                value={vm.form.station}
                onChangeText={vm.setStation}
                placeholder="Ex.: Posto Ipiranga"
                autoCapitalize="words"
                maxLength={80}
              />
              {vm.stationSuggestions.length > 0 ? (
                <View style={styles.chips}>
                  {vm.stationSuggestions.map((name) => (
                    <Chip key={name} label={name} onPress={() => vm.setStation(name)} />
                  ))}
                </View>
              ) : null}
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
  pair: { flexDirection: 'row', gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
