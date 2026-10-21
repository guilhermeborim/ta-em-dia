import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface VehicleSelectorProps {
  name: string;
  /** Ex.: "VW Gol 1.0 · 2019 · 48.320 km". */
  details: string;
  onPress?: () => void;
}

/** Veículo selecionado, no topo das telas. Toque abre a troca de veículo. */
export function VehicleSelector({ name, details, onPress }: VehicleSelectorProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Veículo ${name}. Trocar veículo`}
      onPress={onPress}
      style={styles.row}
    >
      <IconAvatar
        icon="car"
        size={44}
        iconSize={22}
        background={colors.primary}
        color={colors.onPrimary}
      />
      <View>
        <View style={styles.nameRow}>
          <Text variant="h2">{name}</Text>
          <Icon name="chevron-down" size={20} color={colors.text} />
        </View>
        <Text variant="small" color="text2">
          {details}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
