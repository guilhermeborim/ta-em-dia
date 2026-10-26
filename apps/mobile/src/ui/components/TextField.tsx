import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamily, size, spacing } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Texto fixo à direita (ex.: unidade). */
  suffix?: string;
  /** Campo obrigatório: mostra um * vermelho depois do rótulo. */
  required?: boolean;
  /** Mensagem de erro abaixo da caixa; a borda fica vermelha. */
  error?: string;
  /** Botão de ícone à direita (ex.: abrir o calendário num campo de data). */
  action?: { icon: IconName; label: string; onPress: () => void };
  /** Para dar foco ao campo por código (ex.: o campo que falta depois da voz). */
  ref?: Ref<TextInput>;
}

/** Campo de texto: rótulo em cima, caixa de 52 pt. A borda fica roxa em foco. */
export function TextField({
  label,
  suffix,
  required,
  error,
  action,
  onFocus,
  onBlur,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text variant="small" color="text2">
        {label}
        {required ? (
          <Text variant="small" color="danger">
            {' *'}
          </Text>
        ) : null}
      </Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          {...input}
          accessibilityLabel={required ? `${label}, obrigatório` : label}
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
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            hitSlop={4}
            style={styles.action}
          >
            <Icon name={action.icon} size={20} color={colors.text2} />
          </Pressable>
        ) : null}
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
  // O ícone tem a área de toque mínima, mas a caixa tem só 52 pt: a área sai um pouco para a margem.
  action: {
    width: size.touchTarget,
    height: size.touchTarget,
    marginRight: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: { borderColor: colors.primary },
  boxError: { borderColor: colors.danger },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.text,
  },
});
