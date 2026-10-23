import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  EmptyState,
  Icon,
  InfoCard,
  LicensePlate,
  PremiumBadge,
  spacing,
  StatTile,
  TeaserCard,
  TopBar,
} from '../../../ui';
import { useVehicleDetailViewModel } from '../viewmodels/useVehicleDetailViewModel';

/** Tela 17: detalhe do veículo (placa, números e dados) com a ação "Atualizar km". */
export function VehicleDetailView() {
  const vm = useVehicleDetailViewModel();
  const view = vm.view;

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title={view?.title ?? 'Veículo'}
        onBack={vm.back}
        action={view ? { icon: 'edit', label: 'Editar veículo', onPress: vm.edit } : undefined}
      />

      {vm.loading ? null : !view ? (
        <View style={styles.content}>
          <EmptyState
            icon="car"
            title="Veículo não encontrado"
            text="Esse veículo não existe mais."
            actionLabel="Voltar"
            onAction={vm.back}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <Icon name={view.icon} size={72} color={colors.primary} />
              {view.plate ? <LicensePlate value={view.plate} /> : null}
            </View>

            <View style={styles.stats}>
              {view.stats.map((stat) => (
                <StatTile key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </View>

            <InfoCard rows={view.rows} />

            {vm.showFipeTeaser ? (
              <TeaserCard
                icon="trend-up"
                title="Valor na FIPE"
                hint="Em breve"
                right={<PremiumBadge />}
              />
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Atualizar km" onPress={vm.updateKm} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: 14, flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  stats: { flexDirection: 'row', gap: 10 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
