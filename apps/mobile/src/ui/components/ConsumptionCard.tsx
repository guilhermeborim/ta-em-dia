import { StyleSheet, View } from 'react-native';
import { colors, shadows } from '../theme/tokens';
import { Icon } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface ConsumptionCardProps {
  /**
   * Média do período, em km/l (km rodados ÷ litros). Vem pronta, como "12,4".
   * Sem ela, o cartão pede mais um abastecimento.
   */
  periodAverage?: string;
  /** Conta da média do período. Ex.: "1.780 km ÷ 143,5 L". */
  periodCalc?: string;
  /** Média exata entre dois tanques cheios. Só aparece quando existir. */
  exactAverage?: string;
}

/** Cartão de consumo: média do período, média exata (se houver) ou aviso de falta de dados. */
export function ConsumptionCard({ periodAverage, periodCalc, exactAverage }: ConsumptionCardProps) {
  const noData = periodAverage === undefined;

  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.header}>
        <Text variant="small" color="text2">
          Média do período
        </Text>
        {!noData && periodCalc ? (
          <Text variant="caption" color="text3">
            {periodCalc}
          </Text>
        ) : null}
      </View>

      {noData ? (
        <View style={styles.empty}>
          <IconAvatar
            icon="gauge"
            size={44}
            iconSize={22}
            background={colors.primarySoft}
            color={colors.primary}
          />
          <Text variant="bodyStrong" style={styles.emptyText}>
            Registre mais um abastecimento para ver sua média
          </Text>
        </View>
      ) : (
        <View style={styles.values}>
          <View style={styles.average}>
            <Text variant="display">{periodAverage}</Text>
            <Text variant="h3" color="text3">
              km/l
            </Text>
          </View>

          {exactAverage ? (
            <>
              <View style={styles.divider} />
              <View style={styles.exact}>
                <Text variant="small" color="text2">
                  Média exata
                </Text>
                <View style={styles.exactValue}>
                  <Text variant="h1">{exactAverage}</Text>
                  <Text variant="small" color="text3">
                    km/l
                  </Text>
                </View>
                <View style={styles.seal}>
                  <Icon name="check" size={12} color={colors.onAccent} />
                  <Text variant="caption" color="onAccent">
                    tanque cheio
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  values: { flexDirection: 'row', gap: 16 },
  average: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  divider: { width: 1, height: 60, backgroundColor: colors.border },
  exact: { gap: 3 },
  exactValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyText: { flex: 1 },
});
