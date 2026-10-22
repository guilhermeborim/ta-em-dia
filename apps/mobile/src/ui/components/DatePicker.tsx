import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

interface DatePickerProps {
  /** Aberto ou fechado: quem usa guarda esse estado. */
  visible: boolean;
  /** Data mostrada ao abrir. */
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Chamada quando a pessoa escolhe um dia. */
  onChange: (date: Date) => void;
  /** Escolheu, cancelou ou tocou fora: quem usa fecha (`visible = false`). */
  onClose: () => void;
}

/**
 * Seletor de data do sistema. No Android abre o diálogo nativo; no iOS, um calendário numa folha
 * de baixo. Escolher um dia chama `onChange` e fecha. Fica sem desenho próprio no Figma (o chip
 * de data sugere o seletor), então usa só o visual nativo e as cores do app.
 */
export function DatePicker({
  visible,
  value,
  minimumDate,
  maximumDate,
  onChange,
  onClose,
}: DatePickerProps) {
  // O diálogo do Android é imperativo: guarda as props mais novas para os callbacks dele.
  const latest = useRef({ value, minimumDate, maximumDate, onChange, onClose });
  latest.current = { value, minimumDate, maximumDate, onChange, onClose };

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const { value: current, minimumDate: min, maximumDate: max } = latest.current;
    DateTimePickerAndroid.open({
      value: current,
      mode: 'date',
      minimumDate: min,
      maximumDate: max,
      onValueChange: (_event, date) => {
        latest.current.onChange(date);
        latest.current.onClose();
      },
      onDismiss: () => latest.current.onClose(),
    });
  }, [visible]);

  if (Platform.OS !== 'ios') return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar calendário"
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text variant="h2">Escolha a data</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={12}
            onPress={onClose}
          >
            <Text variant="body" color="primary">
              Fechar
            </Text>
          </Pressable>
        </View>
        <DateTimePicker
          value={value}
          mode="date"
          display="inline"
          locale="pt-BR"
          themeVariant="light"
          accentColor={colors.primary}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_event, date) => {
            onChange(date);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
