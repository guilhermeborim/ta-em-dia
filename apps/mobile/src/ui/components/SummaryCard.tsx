import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors, primaryGradient, radius } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

interface SummaryCardProps {
  /** Ex.: "Gasto em outubro". */
  title: string;
  /** Valor já formatado, sem o "R$". Ex.: "842,60". */
  amount: string;
  /** Variação contra o mês anterior. Ex.: "12% vs set". Omita se não houver. */
  variation?: string;
  /** Seta da variação: para baixo (gastou menos) ou para cima. Padrão: para baixo. */
  variationTrend?: 'up' | 'down';
  /** Ex.: "Projeção do mês: R$ 1.090". */
  projection?: string;
  stats: { label: string; value: string }[];
}

/** Cartão em destaque do Início: gasto do mês, projeção e três números. */
export function SummaryCard({
  title,
  amount,
  variation,
  variationTrend = 'down',
  projection,
  stats,
}: SummaryCardProps) {
  return (
    <LinearGradient
      colors={[...primaryGradient.colors]}
      start={primaryGradient.start}
      end={primaryGradient.end}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text variant="bodyStrong" color="onPrimary" style={styles.soft}>
          {title}
        </Text>
        {variation ? (
          <View style={styles.variation}>
            <Icon
              name={variationTrend === 'up' ? 'trend-up' : 'trend-down'}
              size={14}
              color={colors.onAccent}
            />
            <Text variant="caption" color="onAccent">
              {variation}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.amountRow}>
        <Text variant="h2" color="onPrimary">
          R$
        </Text>
        <Text variant="display" color="onPrimary">
          {amount}
        </Text>
      </View>

      {projection ? (
        <Text variant="small" color="onPrimary" style={styles.muted}>
          {projection}
        </Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text variant="caption" color="onPrimary" style={styles.faint}>
              {stat.label}
            </Text>
            <Text variant="h3" color="onPrimary">
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 20, borderRadius: radius.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soft: { opacity: 0.85 },
  muted: { opacity: 0.8 },
  faint: { opacity: 0.75 },
  variation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  divider: { height: 1, backgroundColor: colors.onPrimary, opacity: 0.2 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
});
