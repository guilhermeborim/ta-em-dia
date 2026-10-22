import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface InfoBannerProps {
  icon: IconName;
  text: string;
}

/** Faixa de dica em roxo claro, com ícone e uma frase. */
export function InfoBanner({ icon, text }: InfoBannerProps) {
  return (
    <View style={styles.banner}>
      <Icon name={icon} size={18} color={colors.primary} />
      <Text variant="small" color="primary" style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  text: { flex: 1 },
});
