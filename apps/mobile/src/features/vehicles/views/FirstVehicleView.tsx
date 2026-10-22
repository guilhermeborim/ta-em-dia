import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, colors, size, spacing, Text, TextField } from '../../../ui';
import { useFirstVehicleViewModel } from '../viewmodels/useFirstVehicleViewModel';

/** Tela 5: cadastro do primeiro veículo (pode pular). */
export function FirstVehicleView() {
  const vm = useFirstVehicleViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.top}>
            <Text variant="small" color="text3">
              {vm.step}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pular"
              onPress={vm.skip}
              style={styles.skip}
            >
              <Text variant="button" color="primary">
                Pular
              </Text>
            </Pressable>
          </View>

          <Text variant="h1">Qual é o seu carro?</Text>

          <View style={styles.chips}>
            {vm.kinds.map((item) => (
              <Chip
                key={item.kind}
                label={item.label}
                selected={vm.form.kind === item.kind}
                onPress={() => vm.setKind(item.kind)}
              />
            ))}
          </View>

          <TextField
            label="Marca"
            value={vm.form.brand}
            onChangeText={vm.setBrand}
            placeholder="Ex.: Volkswagen"
            autoCapitalize="words"
            maxLength={40}
          />
          <TextField
            label="Modelo"
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
                value={vm.form.year}
                onChangeText={vm.setYear}
                placeholder="2019"
                keyboardType="number-pad"
                maxLength={4}
              />
              {vm.errors.year ? (
                <Text variant="caption" color="danger">
                  {vm.errors.year}
                </Text>
              ) : null}
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
            label="Km atual (olha no painel)"
            suffix="km"
            value={vm.form.km}
            onChangeText={vm.setKm}
            placeholder="0"
            keyboardType="number-pad"
          />
          {vm.errors.km ? (
            <Text variant="caption" color="danger">
              {vm.errors.km}
            </Text>
          ) : null}

          <View style={styles.spacer} />

          <Button label="Salvar veículo" onPress={vm.save} loading={vm.busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    gap: 14,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: {
    minHeight: size.touchTarget,
    minWidth: size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  spacer: { flexGrow: 1 },
});
