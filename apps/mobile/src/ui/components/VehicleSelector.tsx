import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface VehicleSelectorProps {
  name: string;
  /** Ex.: "VW Gol 1.0 · 2019 · 48.320 km". */
  details: string;
  /** Ícone do tipo de veículo: `car` (padrão) ou `motorbike`. */
  icon?: IconName;
  /** Premium (vários veículos): mostra a seta de trocar veículo. */
  premium?: boolean;
  onPress?: () => void;
}

/** Veículo selecionado, no topo das telas. Toque abre a troca de veículo. */
export function VehicleSelector({
  name,
  details,
  icon = 'car',
  premium = false,
  onPress,
}: VehicleSelectorProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Veículo ${name}. Trocar veículo`}
      onPress={onPress}
      style={styles.row}
    >
      <IconAvatar
        icon={icon}
        size={44}
        iconSize={22}
        background={colors.primary}
        color={colors.onPrimary}
      />
      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <Text variant="h2" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {premium && <Icon name="chevron-down" size={20} color={colors.text} />}
        </View>
        <Text variant="small" color="text2" numberOfLines={1}>
          {details}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Encolhe com nome ou detalhes longos, para não empurrar o que vem ao lado (ex.: selo de sync).
  row: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1 },
});
