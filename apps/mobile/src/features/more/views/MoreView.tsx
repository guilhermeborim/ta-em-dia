import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, EmptyState, MenuItem, spacing, Text } from '../../../ui';
import { useMoreViewModel } from '../viewmodels/useMoreViewModel';

/** Aba Mais (tela 15), provisória: o menu de verdade vem no item "Mais, Configurações e Premium". */
export function MoreView() {
  const vm = useMoreViewModel();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          icon="grid"
          title="Mais opções em breve"
          text="Veículos, documentos, conta e configurações aparecem aqui."
        />
        {vm.showDevTools ? (
          <View style={styles.dev}>
            <Text variant="small" color="text3">
              Só em desenvolvimento
            </Text>
            <MenuItem icon="gauge" label="Status do app" onPress={vm.openStatus} />
            <MenuItem icon="sliders" label="Catálogo de componentes" onPress={vm.openComponents} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  dev: { gap: spacing.sm },
});
