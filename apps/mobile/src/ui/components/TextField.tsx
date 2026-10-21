import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, spacing } from '../theme/tokens';
import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Texto fixo à direita (ex.: unidade). */
  suffix?: string;
}

/** Campo de texto: rótulo em cima, caixa de 52 pt. A borda fica roxa em foco. */
export function TextField({ label, suffix, onFocus, onBlur, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text variant="small" color="text2">
        {label}
      </Text>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={colors.text3}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {suffix ? (
          <Text variant="body" color="text3">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.text,
  },
});
