import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { Chip } from './Chip';
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
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
  onPress?: () => void;
}

/** Item da lista de abastecimentos. */
export function FuelItem({ title, details, total, kmPerLiter, flat, onPress }: FuelItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${total}`}
      onPress={onPress}
      style={[styles.row, styles.fuel, flat && styles.flat]}
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

interface SuggestionItemProps {
  /** Ex.: "Correia dentada". */
  title: string;
  /** Ex.: "A cada 60.000 km". */
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
}

/** Item sugerido do plano de manutenção: nome, intervalo e a ação "Ativar". */
export function SuggestionItem({ title, subtitle, actionLabel, onAction }: SuggestionItemProps) {
  return (
    <View style={[styles.row, styles.suggestion]}>
      <IconAvatar
        icon="wrench"
        size={36}
        iconSize={18}
        background={colors.surface2}
        color={colors.text2}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Chip label={actionLabel} tone="primary" onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  fuel: { gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.button },
  flat: { borderRadius: 0 },
  suggestion: { gap: 12, paddingLeft: 16, paddingRight: 12, paddingVertical: 12 },
  menu: { gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  main: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
