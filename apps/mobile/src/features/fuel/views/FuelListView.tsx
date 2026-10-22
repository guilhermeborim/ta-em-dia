import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chip,
  colors,
  ConsumptionCard,
  EmptyState,
  FloatingButton,
  FuelItem,
  spacing,
  Text,
} from '../../../ui';
import { useFuelListViewModel } from '../viewmodels/useFuelListViewModel';

/** Tela 8: lista de abastecimentos por mês, com filtros e médias. */
export function FuelListView() {
  const vm = useFuelListViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} edges={['top']} />;

  if (!vm.hasVehicle || vm.isEmpty) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="h1">Abastecimentos</Text>
          {vm.hasVehicle ? (
            <EmptyState
              icon="fuel"
              title="Nenhum abastecimento ainda"
              text="Registre o primeiro para acompanhar gasto e consumo."
              actionLabel="+ Abastecer"
              onAction={vm.openNewEntry}
            />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, styles.withFab]}>
        <Text variant="h1">Abastecimentos</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          {vm.chips.map((chip) => (
            <Chip
              key={chip.filter}
              label={chip.label}
              selected={chip.selected}
              onPress={() => vm.selectFilter(chip.filter)}
            />
          ))}
        </ScrollView>

        <ConsumptionCard {...vm.average} />

        {vm.sections.length === 0 ? (
          <EmptyState
            icon="fuel"
            title="Nada por aqui"
            text="Nenhum abastecimento com esse filtro."
          />
        ) : (
          vm.sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h3">{section.title}</Text>
                <Text variant="small" color="text2">
                  {section.summary}
                </Text>
              </View>
              <View style={styles.group}>
                {section.items.map((item) => (
                  <FuelItem
                    key={item.id}
                    flat
                    title={item.title}
                    details={item.details}
                    total={item.total}
                    kmPerLiter={item.kmPerLiter}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <FloatingButton label="Abastecer" onPress={vm.openNewEntry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  // Espaço para o botão flutuante não cobrir o último item.
  withFab: { paddingBottom: 96 },
  // Os chips vão até a borda da tela ao rolar.
  chipsScroll: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  group: { gap: 1, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.border },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
