import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { OwnBadge } from './Badges';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tipo criado pela pessoa: mostra o selo "Seu". */
  own?: boolean;
  /** Ícone antes do rótulo (ex.: data e veículo no formulário). */
  icon?: IconName;
  /** Contorno e texto roxos (ação, ex.: "Ativar"). */
  tone?: 'primary';
}

/** Chip de escolha (combustível, tipo de manutenção). Selecionado fica escuro. */
export function Chip({ label, selected = false, onPress, own = false, icon, tone }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={own ? `${label}, criado por você` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.base,
        selected ? styles.selected : tone === 'primary' ? styles.primary : styles.normal,
        own ? styles.own : icon ? styles.withIcon : styles.plain,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? colors.bg : colors.text} /> : null}
      <Text
        variant="small"
        color={selected ? 'bg' : tone === 'primary' ? 'primary' : icon ? 'text' : 'text2'}
      >
        {label}
      </Text>
      {own ? <OwnBadge /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, gap: 8 },
  normal: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  primary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  selected: { backgroundColor: colors.text, borderWidth: 1.5, borderColor: colors.text },
  plain: { paddingHorizontal: 14, paddingVertical: 8 },
  withIcon: { paddingLeft: 12, paddingRight: 14, paddingVertical: 8, gap: 6 },
  own: { paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
});
