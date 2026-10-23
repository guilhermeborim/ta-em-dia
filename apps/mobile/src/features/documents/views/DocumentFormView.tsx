import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  colors,
  DatePicker,
  EmptyState,
  Icon,
  size,
  spacing,
  Text,
  TextField,
} from '../../../ui';
import { useDocumentFormViewModel } from '../viewmodels/useDocumentFormViewModel';

/**
 * Adicionar ou editar um prazo (aberto por Documentos e prazos). Sem frame no Figma: segue os
 * formulários do app. Só a data de vencimento; nada de número nem foto.
 */
function DocumentFormView({ mode }: { mode: 'add' | 'edit' }) {
  const vm = useDocumentFormViewModel(mode);

  if (vm.loading) return <SafeAreaView style={styles.container} />;

  const nothingToAdd = !vm.isEdit && vm.kinds.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={vm.close}
              style={styles.close}
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
            <Text variant="h2" style={styles.flex}>
              {vm.title}
            </Text>
          </View>

          {vm.notFound || nothingToAdd ? (
            <EmptyState
              icon="file"
              title={vm.notFound ? 'Prazo não encontrado' : 'Tudo cadastrado'}
              text={
                vm.notFound
                  ? 'Esse prazo não existe mais.'
                  : 'Todos os prazos já estão na lista. Toque num deles para mudar a data.'
              }
              actionLabel="Fechar"
              onAction={vm.close}
            />
          ) : (
            <>
              {vm.isEdit ? null : (
                <View style={styles.kinds}>
                  <Text variant="small" color="text2">
                    Documento{' '}
                    <Text variant="small" color="danger">
                      *
                    </Text>
                  </Text>
                  <View style={styles.chips}>
                    {vm.kinds.map((item) => (
                      <Chip
                        key={item.kind}
                        label={item.label}
                        selected={vm.form.kind === item.kind}
                        onPress={() => vm.selectKind(item.kind)}
                      />
                    ))}
                  </View>
                  {vm.errors.kind ? (
                    <Text variant="small" color="danger">
                      {vm.errors.kind}
                    </Text>
                  ) : null}
                </View>
              )}

              <TextField
                label="Vencimento"
                required
                error={vm.errors.dueDate}
                value={vm.form.dueDate}
                onChangeText={vm.setDueDate}
                placeholder="dd/mm/aaaa"
                keyboardType="number-pad"
                maxLength={10}
                action={{ icon: 'calendar', label: 'Abrir calendário', onPress: vm.openDatePicker }}
              />

              <View style={styles.kinds}>
                <Text variant="small" color="text2">
                  Avisar antes
                </Text>
                <View style={styles.chips}>
                  {vm.notifyOptions.map((option) => (
                    <Chip
                      key={option.days}
                      label={option.label}
                      selected={option.selected}
                      onPress={() => vm.toggleNotify(option.days)}
                    />
                  ))}
                </View>
                <Text variant="small" color="text3">
                  Às 9h do dia marcado. Sem nenhum marcado, não avisamos.
                </Text>
              </View>

              {vm.renewYear !== null ? (
                <View style={styles.danger}>
                  <Button
                    label={`Renovar para ${vm.renewYear}`}
                    variant="outline"
                    onPress={vm.renew}
                    disabled={vm.busy}
                  />
                  <Text variant="small" color="text3" style={styles.renewHint}>
                    Cria o prazo do ano seguinte e guarda este no histórico.
                  </Text>
                </View>
              ) : null}

              {vm.isEdit ? (
                <View style={styles.danger}>
                  <Button
                    label="Excluir prazo"
                    variant="danger"
                    onPress={vm.confirmDelete}
                    disabled={vm.busy}
                  />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {vm.notFound || nothingToAdd ? null : (
          <View style={styles.footer}>
            <Button label="Salvar" onPress={vm.save} loading={vm.busy} />
          </View>
        )}
      </KeyboardAvoidingView>
      <DatePicker
        visible={vm.pickerOpen}
        value={vm.pickerValue}
        minimumDate={vm.pickerMin}
        maximumDate={vm.pickerMax}
        onChange={vm.pickDueDate}
        onClose={vm.closeDatePicker}
      />
    </SafeAreaView>
  );
}

export const NewDocumentView = () => <DocumentFormView mode="add" />;
export const EditDocumentView = () => <DocumentFormView mode="edit" />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  kinds: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  danger: { paddingTop: spacing.md },
  renewHint: { paddingTop: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
