import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCard, colors, EmptyState, spacing, TopBar } from '../../../ui';
import { useAlertsViewModel } from '../viewmodels/useAlertsViewModel';

/** Todos os alertas: manutenções e documentos perto de vencer ou vencidos (sem frame no Figma). */
export function AlertsView() {
  const vm = useAlertsViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Todos os alertas" onBack={vm.back} />
      {vm.loading ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          {vm.isEmpty ? (
            <EmptyState
              icon="check"
              title="Tudo em dia"
              text="Nenhuma manutenção ou documento perto de vencer."
            />
          ) : (
            vm.cards.map((card) => (
              <AlertCard
                key={card.id}
                tone={card.tone}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                status={card.status}
                progress={card.progress}
                progressLabel={card.progressLabel}
                hint={card.hint}
                onPress={() => vm.openAlert(card)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
});
