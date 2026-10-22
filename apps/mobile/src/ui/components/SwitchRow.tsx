import { StyleSheet, Switch, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Text } from './Text';

interface SwitchRowProps {
  label: string;
  /** Linha menor abaixo do rótulo (ex.: "Opcional"). */
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
}

/** Cartão com rótulo e interruptor (ex.: "Tanque cheio"). */
export function SwitchRow({ label, hint, value, onValueChange, flat }: SwitchRowProps) {
  return (
    <View style={[styles.row, flat && styles.flat]}>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="small" color="text2">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surface2, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.surface2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  flat: { borderRadius: 0 },
  texts: { flex: 1, gap: 2 },
});
