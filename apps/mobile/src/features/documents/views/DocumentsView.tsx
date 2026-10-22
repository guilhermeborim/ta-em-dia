import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, DocumentItem, EmptyState, spacing, Text, TopBar } from '../../../ui';
import { useDocumentsViewModel } from '../viewmodels/useDocumentsViewModel';

/** Tela 18: IPVA, licenciamento e seguro do veículo, e a CNH, com a situação de cada prazo. */
export function DocumentsView() {
  const vm = useDocumentsViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Documentos e prazos" onBack={vm.back} />

      {vm.loading ? null : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {vm.isEmpty ? (
              <EmptyState
                icon="file"
                title="Nenhum prazo ainda"
                text="Cadastre o vencimento do IPVA, do licenciamento, do seguro e da CNH. Só a data: sem número nem foto."
              />
            ) : (
              vm.sections.map((section) => (
                <View key={section.key} style={styles.section}>
                  <Text variant="caption" color="text3">
                    {section.title}
                  </Text>
                  <View style={styles.group}>
                    {section.items.map((item) => (
                      <DocumentItem
                        key={item.id}
                        flat
                        icon={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
                        tone={item.tone}
                        status={item.status}
                        onPress={() => vm.open(item.id)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {vm.canAdd ? (
            <View style={styles.footer}>
              <Button label="+ Adicionar prazo" onPress={vm.add} />
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  section: { gap: spacing.sm },
  group: { gap: 1, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.border },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
