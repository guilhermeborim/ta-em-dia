import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadows, size } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface FloatingButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
}

/** Botão flutuante em pílula lima (ex.: "Abastecer"). */
export function FloatingButton({ label, onPress, icon = 'fuel' }: FloatingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.base, shadows.floating, { opacity: pressed ? 0.9 : 1 }]}
    >
      <Icon name={icon} size={22} color={colors.onAccent} />
      <Text variant="button" color="onAccent">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
