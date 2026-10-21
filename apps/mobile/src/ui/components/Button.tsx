import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, size, spacing } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text, type TextColor } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';

const variants: Record<
  ButtonVariant,
  { background?: string; text: TextColor; border?: string; pill?: boolean }
> = {
  primary: { background: colors.primary, text: 'onPrimary' },
  secondary: { background: colors.primarySoft, text: 'primary' },
  outline: { border: colors.border, text: 'text' },
  ghost: { text: 'primary' },
  danger: { background: colors.dangerSoft, text: 'danger' },
  accent: { background: colors.accent, text: 'onAccent', pill: true },
};

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Botão do design: 56 pt de altura, 6 variantes. O acento é em pílula. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const v = variants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.background,
          borderRadius: v.pill ? radius.pill : radius.button,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.text]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={colors[v.text]} /> : null}
          <Text variant="button" color={v.text}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.button,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
