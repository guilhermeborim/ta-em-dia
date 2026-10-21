import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface FuelItemProps {
  /** Ex.: "18 out · Posto Ipiranga". */
  title: string;
  /** Ex.: "38,2 L · Gasolina · tanque cheio". */
  details: string;
  /** Total já formatado. Ex.: "R$ 229,10". */
  total: string;
  /** Média do trecho. Ex.: "13,1 km/l". Omita quando não der para calcular. */
  kmPerLiter?: string;
  onPress?: () => void;
}

/** Item da lista de abastecimentos. */
export function FuelItem({ title, details, total, kmPerLiter, onPress }: FuelItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${total}`}
      onPress={onPress}
      style={[styles.row, styles.fuel]}
    >
      <IconAvatar
        icon="fuel"
        size={40}
        iconSize={20}
        background={colors.primarySoft}
        color={colors.primary}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {details}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="bodyStrong">{total}</Text>
        {kmPerLiter ? (
          <Text variant="small" color="success">
            {kmPerLiter}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  /** Texto ou número à direita (ex.: quantidade). */
  value?: string;
  onPress?: () => void;
}

/** Linha de menu (aba Mais): ícone, rótulo, valor opcional e seta. */
export function MenuItem({ icon, label, value, onPress }: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.row, styles.menu]}
    >
      <IconAvatar
        icon={icon}
        size={36}
        iconSize={18}
        background={colors.surface2}
        color={colors.text}
      />
      <Text variant="bodyStrong" style={styles.main}>
        {label}
      </Text>
      {value ? (
        <Text variant="small" color="text3">
          {value}
        </Text>
      ) : null}
      <Icon name="chevron-right" size={20} color={colors.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  fuel: { gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.button },
  menu: { gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  main: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
