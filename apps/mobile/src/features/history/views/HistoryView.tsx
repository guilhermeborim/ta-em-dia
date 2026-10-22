import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chip,
  colors,
  EmptyState,
  Icon,
  SegmentedControl,
  size,
  spacing,
  Text,
  TimelineItem,
} from '../../../ui';
import { useHistoryViewModel } from '../viewmodels/useHistoryViewModel';

/** Tela 13: linha do tempo do veículo (abastecimentos e manutenções), com filtros. */
export function HistoryView() {
  const vm = useHistoryViewModel();

  const top = (
    <View style={styles.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={vm.back}
        style={styles.round}
      >
        <Icon name="chevron-left" size={22} color={colors.text} />
      </Pressable>
      <Text variant="h2" style={styles.title}>
        Histórico
      </Text>
      {vm.loading || vm.isEmpty || !vm.hasVehicle ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrar por período"
          accessibilityState={{ expanded: vm.periodOpen }}
          onPress={vm.togglePeriod}
          style={[styles.round, vm.periodActive && styles.roundActive]}
        >
          <Icon name="calendar" size={20} color={vm.periodActive ? colors.primary : colors.text} />
        </Pressable>
      )}
    </View>
  );

  if (vm.loading) return <SafeAreaView style={styles.container}>{top}</SafeAreaView>;

  if (!vm.hasVehicle || vm.isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        {top}
        <ScrollView contentContainerStyle={styles.content}>
          {vm.hasVehicle ? (
            <EmptyState
              icon="history"
              title="Nada no histórico ainda"
              text="Abastecimentos e manutenções que você registrar aparecem aqui."
            />
          ) : (
            <EmptyState
              icon="car"
              title="Cadastre seu veículo"
              text="Com um veículo cadastrado, o histórico dele aparece aqui."
              actionLabel="Cadastrar veículo"
              onAction={vm.addVehicle}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lastSection = vm.sections.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {top}
      <ScrollView contentContainerStyle={styles.content}>
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

        {vm.periodOpen ? (
          <SegmentedControl options={vm.periods} value={vm.period} onChange={vm.selectPeriod} />
        ) : null}

        {vm.sections.length === 0 ? (
          <EmptyState icon="history" title="Nada por aqui" text="Nenhum item com esses filtros." />
        ) : (
          vm.sections.map((section, sectionIndex) => (
            <View key={section.key}>
              <Text variant="caption" color="text3" style={styles.month}>
                {section.title}
              </Text>
              {section.items.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  kind={item.kind}
                  title={item.title}
                  details={item.details}
                  value={item.value}
                  last={sectionIndex === lastSection && index === section.items.length - 1}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  round: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  roundActive: { backgroundColor: colors.primarySoft },
  title: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md, flexGrow: 1 },
  // Os chips vão até a borda da tela ao rolar.
  chipsScroll: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  month: { paddingTop: spacing.md, paddingBottom: spacing.sm },
});
