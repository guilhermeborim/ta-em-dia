import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionCard,
  AlertCard,
  colors,
  ConsumptionCard,
  EmptyState,
  FloatingButton,
  FuelItem,
  InfoBanner,
  size,
  spacing,
  SummaryCard,
  SyncPill,
  Text,
  Toast,
  VehicleSelector,
} from '../../../ui';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';

/** Telas 7, 7c e 7d (com abastecimentos, aviso ao salvar) e 7b (vazio): Início, salvo no aparelho. */
export function DashboardView() {
  const vm = useDashboardViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} edges={['top']} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, vm.lastEntry && styles.withFab]}>
        {vm.vehicle ? (
          <>
            <View style={styles.top}>
              <VehicleSelector name={vm.vehicle.name} details={vm.vehicle.details} />
              <SyncPill state="local" label="No aparelho" />
            </View>

            <ActionCard
              tone="soft"
              icon="cloud"
              title="Salve seus dados na nuvem"
              text="Entre com Google ou Apple"
              onPress={vm.saveData}
            />

            {vm.summary ? (
              <>
                <SummaryCard
                  title={vm.summary.title}
                  amount={vm.summary.amount}
                  variation={vm.summary.variation?.label}
                  variationTrend={vm.summary.variation?.trend}
                  projection={vm.summary.projection}
                  stats={vm.summary.stats}
                />
                <ConsumptionCard {...vm.average} />
              </>
            ) : null}

            {vm.showEmptyFuel ? (
              <EmptyState
                icon="fuel"
                title="Registre seu primeiro abastecimento"
                text="Com 2 abastecimentos de tanque cheio, o Tá em Dia já mostra seu km/l real."
                actionLabel="+ Abastecer agora"
                onAction={vm.openFuel}
              />
            ) : null}

            {vm.alertCards.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="h3">Próximos alertas</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver todos os alertas"
                    onPress={vm.openMaintenance}
                    style={styles.seeAll}
                  >
                    <Text variant="bodyStrong" color="primary">
                      Ver todos
                    </Text>
                  </Pressable>
                </View>
                {vm.alertCards.map((card) => (
                  <AlertCard
                    key={card.id}
                    tone={card.tone}
                    icon="wrench"
                    title={card.title}
                    subtitle={card.subtitle}
                    status={card.status}
                    progress={card.progress}
                    progressLabel={card.progressLabel}
                    hint={card.hint}
                    onPress={() => vm.openPlan(card.id)}
                  />
                ))}
              </View>
            ) : vm.hasReminders ? (
              <InfoBanner icon="check" text="Tudo em dia: nenhuma manutenção perto de vencer." />
            ) : (
              <ActionCard
                icon="wrench"
                title="Ative os lembretes de manutenção"
                text="Óleo, filtros, pneus e revisão"
                avatarBackground={colors.warningSoft}
                avatarColor={colors.warning}
                onPress={vm.openMaintenance}
              />
            )}

            {vm.lastEntry ? (
              <View style={styles.last}>
                <Text variant="h3">Último abastecimento</Text>
                <FuelItem
                  title={vm.lastEntry.title}
                  details={vm.lastEntry.details}
                  total={vm.lastEntry.total}
                  kmPerLiter={vm.lastEntry.kmPerLiter}
                />
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

      {vm.lastEntry ? (
        <View style={styles.fab}>
          <FloatingButton label="Abastecer" onPress={vm.openFuel} />
        </View>
      ) : null}

      {vm.toast ? (
        <View style={[styles.toast, vm.lastEntry && styles.toastAboveFab]}>
          <Toast title={vm.toast.title} message={vm.toast.message} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  last: { gap: spacing.md },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: { minHeight: size.touchTarget, justifyContent: 'center' },
  // Espaço para o botão flutuante não cobrir o último item.
  withFab: { paddingBottom: 96 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  // O botão flutuante tem 56 pt de altura.
  toastAboveFab: { bottom: spacing.lg + 56 + spacing.md },
});
