import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCard,
  colors,
  EmptyState,
  FloatingButton,
  NoIntervalCard,
  SegmentedControl,
  SuggestionItem,
  spacing,
  Text,
} from '../../../ui';
import { useMaintenanceViewModel } from '../viewmodels/useMaintenanceViewModel';

/** Tela 10: manutenções (Próximas e Feitas) com as sugeridas para ativar. */
export function MaintenanceListView() {
  const vm = useMaintenanceViewModel();

  if (vm.loading) return <SafeAreaView style={styles.container} edges={['top']} />;

  if (!vm.hasVehicle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="h1">Manutenções</Text>
          <EmptyState
            icon="car"
            title="Cadastre seu veículo"
            text="Com um veículo cadastrado, você ativa os lembretes de manutenção."
            actionLabel="Cadastrar veículo"
            onAction={vm.addVehicle}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasPlans = vm.alerts.length + vm.noInterval.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, styles.withFab]}>
        <Text variant="h1">Manutenções</Text>

        <SegmentedControl options={vm.tabs} value={vm.tab} onChange={vm.setTab} />

        {vm.tab === 'done' ? (
          <EmptyState
            icon="wrench"
            title="Nada registrado ainda"
            text="As manutenções que você marcar como feitas aparecem aqui."
          />
        ) : (
          <>
            {vm.alerts.map((card) => (
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
              />
            ))}
            {vm.noInterval.map((card) => (
              <NoIntervalCard
                key={card.id}
                title={card.title}
                own={card.own}
                lastDone={card.lastDone}
              />
            ))}

            {!hasPlans ? (
              <EmptyState
                icon="wrench"
                title="Nenhum lembrete ativo"
                text="Ative os itens sugeridos abaixo para ser avisado na hora certa."
              />
            ) : null}

            {vm.suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                <Text variant="h3">Sugeridas para o seu {vm.vehicleName}</Text>
                <View style={styles.group}>
                  {vm.suggestions.map((item) => (
                    <SuggestionItem
                      key={item.code}
                      title={item.title}
                      subtitle={item.subtitle}
                      actionLabel="Ativar"
                      onAction={() => vm.activate(item.code)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.fab}>
        <FloatingButton label="Abastecer" onPress={vm.openNewFuelEntry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: 14 },
  // Espaço para o botão flutuante não cobrir o último item.
  withFab: { paddingBottom: 96 },
  suggestions: { gap: spacing.md },
  group: { gap: 1, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.border },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
