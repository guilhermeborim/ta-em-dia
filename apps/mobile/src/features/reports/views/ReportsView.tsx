import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  ConsumptionCard,
  EmptyState,
  LineChart,
  SegmentedControl,
  spacing,
  StackedBarChart,
  StatTile,
  StatusPill,
  Text,
} from '../../../ui';
import { useReportsViewModel } from '../viewmodels/useReportsViewModel';

const legend = [
  { category: 'fuel' as const, label: 'Combustível' },
  { category: 'maint' as const, label: 'Manutenção' },
];

/** Tela 14: totais do período, gasto por mês (combustível e manutenção) e consumo por trecho. */
export function ReportsView() {
  const vm = useReportsViewModel();
  const report = vm.report;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1">Relatórios</Text>

        {vm.loading ? null : !vm.hasVehicle ? (
          <EmptyState
            icon="car"
            title="Cadastre seu veículo"
            text="Com um veículo cadastrado, os relatórios dele aparecem aqui."
            actionLabel="Cadastrar veículo"
            onAction={vm.addVehicle}
          />
        ) : !vm.hasData || !report ? (
          <EmptyState
            icon="chart"
            title="Nada para mostrar ainda"
            text="Registre abastecimentos e manutenções para ver gastos e consumo por período."
            actionLabel="+ Abastecer"
            onAction={vm.openFuel}
          />
        ) : (
          <>
            {vm.showPeriods ? (
              <SegmentedControl options={vm.periods} value={vm.period} onChange={vm.selectPeriod} />
            ) : null}

            <ConsumptionCard {...report.average} />

            <View style={styles.stats}>
              {report.stats.map((stat) => (
                <StatTile key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.totalRow}>
                <View>
                  <Text variant="small" color="text2">
                    {report.title}
                  </Text>
                  <View style={styles.amount}>
                    <Text variant="h3" color="text3">
                      R$
                    </Text>
                    <Text variant="displayMedium">{report.total}</Text>
                  </View>
                </View>
                {report.variation ? (
                  <StatusPill tone={report.variation.tone} label={report.variation.label} />
                ) : null}
              </View>
              <StackedBarChart bars={report.bars} legend={legend} />
            </View>

            <View style={styles.card}>
              <View style={styles.titleRow}>
                <Text variant="h3">Consumo por trecho</Text>
                <Text variant="bodyStrong" color="text3">
                  km/l
                </Text>
              </View>
              {report.consumption.points.length >= 2 ? (
                <LineChart points={report.consumption.points} labels={report.consumption.labels} />
              ) : (
                <Text variant="small" color="text2">
                  Registre mais abastecimentos de tanque cheio para ver o consumo trecho a trecho.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40, gap: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  card: { gap: 14, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.surface },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
