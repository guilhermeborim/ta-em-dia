import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, typography } from '../theme/tokens';
import { Text } from './Text';

interface NumberFieldProps extends Omit<TextInputProps, 'style' | 'keyboardType'> {
  label: string;
  /** Prefixo da unidade (ex.: "R$"). */
  prefix?: string;
  /** Mensagem de erro abaixo da caixa; a borda fica vermelha. */
  error?: string;
}

/** Campo de número grande (ex.: total pago): borda roxa de 2 pt e número em destaque. */
export function NumberField({ label, prefix, error, ...input }: NumberFieldProps) {
  return (
    <View style={[styles.box, !!error && styles.boxError]}>
      <Text variant="small" color="text2">
        {label}
      </Text>
      <View style={styles.row}>
        {prefix ? (
          <Text variant="h2" color="text3">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.text3}
          style={styles.input}
        />
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamily.display,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight,
    letterSpacing: typography.display.letterSpacing,
    color: colors.text,
  },
});
