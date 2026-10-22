import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Text } from './Text';

interface StatTileProps {
  /** Ex.: "Km atual". */
  label: string;
  /** Ex.: "48.910". */
  value: string;
}

/** Número com rótulo pequeno (ex.: "Km atual", "Custo/km"). Use em linha, 3 por vez. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.tile}>
      <Text variant="caption" color="text3">
        {label}
      </Text>
      <Text variant="h3" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
});
