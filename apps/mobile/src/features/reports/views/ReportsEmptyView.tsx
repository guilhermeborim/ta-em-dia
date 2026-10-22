import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, EmptyState, spacing } from '../../../ui';

/** Aba provisória: um vazio simples até a tela de verdade chegar (ver docs/06-backlog.md). */
export function ReportsEmptyView() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon="chart"
          title="Relatórios em breve"
          text="Gastos e consumo por período aparecem aqui."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
});
