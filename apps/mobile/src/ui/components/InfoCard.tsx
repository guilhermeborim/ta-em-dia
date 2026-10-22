import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Text, type TextColor } from './Text';

export interface InfoRow {
  label: string;
  value: string;
  /** Cor do valor. Padrão: texto normal. */
  tone?: 'ok' | 'warning' | 'danger';
}

const toneColor: Record<NonNullable<InfoRow['tone']>, TextColor> = {
  ok: 'success',
  warning: 'warning',
  danger: 'danger',
};

/** Cartão de linhas "rótulo ... valor", separadas por uma linha fina (ex.: dados do plano). */
export function InfoCard({ rows }: { rows: InfoRow[] }) {
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View key={row.label} style={[styles.row, index > 0 && styles.divider]}>
          <Text variant="body" color="text2">
            {row.label}
          </Text>
          <Text
            variant="bodyStrong"
            color={row.tone ? toneColor[row.tone] : 'text'}
            style={styles.value}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 18, backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  value: { flexShrink: 1, textAlign: 'right' },
});
