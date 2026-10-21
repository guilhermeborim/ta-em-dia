import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { OwnBadge } from './Badges';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tipo criado pela pessoa: mostra o selo "Seu". */
  own?: boolean;
}

/** Chip de escolha (combustível, tipo de manutenção). Selecionado fica escuro. */
export function Chip({ label, selected = false, onPress, own = false }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={own ? `${label}, criado por você` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.base,
        selected ? styles.selected : styles.normal,
        own ? styles.own : styles.plain,
      ]}
    >
      <Text variant="small" color={selected ? 'bg' : 'text2'}>
        {label}
      </Text>
      {own ? <OwnBadge /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, gap: 8 },
  normal: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  selected: { backgroundColor: colors.text, borderWidth: 1.5, borderColor: colors.text },
  plain: { paddingHorizontal: 14, paddingVertical: 8 },
  own: { paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
});
