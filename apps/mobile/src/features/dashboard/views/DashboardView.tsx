import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionCard,
  colors,
  EmptyState,
  spacing,
  SyncPill,
  Toast,
  VehicleSelector,
} from '../../../ui';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';

/** Tela 7b: Início. Por enquanto só o estado vazio (sem abastecimentos), salvo no aparelho. */
export function DashboardView() {
  const vm = useDashboardViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} edges={['top']} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
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

            {vm.showEmptyFuel ? (
              <EmptyState
                icon="fuel"
                title="Registre seu primeiro abastecimento"
                text="Com 2 abastecimentos de tanque cheio, o Tá em Dia já mostra seu km/l real."
                actionLabel="+ Abastecer agora"
                onAction={vm.openFuel}
              />
            ) : null}

            <ActionCard
              icon="wrench"
              title="Ative os lembretes de manutenção"
              text="Óleo, filtros, pneus e revisão"
              avatarBackground={colors.warningSoft}
              avatarColor={colors.warning}
              onPress={vm.openMaintenance}
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

      {vm.toast ? (
        <View style={styles.toast}>
          <Toast title={vm.toast} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
});
