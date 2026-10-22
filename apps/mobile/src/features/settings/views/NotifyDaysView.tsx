import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, colors, spacing, Text, TopBar } from '../../../ui';
import { useNotifyDaysViewModel } from '../viewmodels/useNotifyDaysViewModel';

/**
 * Antecedência padrão dos prazos de documentos (aberta por Configurações). Sem frame no Figma:
 * segue o "Avisar antes" do formulário de prazo. Vale só para prazos novos.
 */
export function NotifyDaysView() {
  const vm = useNotifyDaysViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Antecedência" onBack={vm.close} />

      {vm.loading ? null : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.group}>
              <Text variant="small" color="text2">
                Avisar antes
              </Text>
              <View style={styles.chips}>
                {vm.options.map((option) => (
                  <Chip
                    key={option.days}
                    label={option.label}
                    selected={option.selected}
                    onPress={() => vm.toggle(option.days)}
                  />
                ))}
              </View>
              {vm.error ? (
                <Text variant="small" color="danger">
                  {vm.error}
                </Text>
              ) : (
                <Text variant="small" color="text3">
                  Às 9h do dia marcado. Vale para os prazos novos; os que já existem mantêm os
                  próprios dias.
                </Text>
              )}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button label="Salvar" onPress={vm.save} loading={vm.busy} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: 14 },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
