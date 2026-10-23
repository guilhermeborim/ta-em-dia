import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { IconAvatar } from './IconAvatar';
import type { IconName } from './Icon';
import { Text } from './Text';

interface TeaserCardProps {
  icon: IconName;
  title: string;
  hint: string;
  /** Selo à direita (ex.: `PremiumBadge`). */
  right?: ReactNode;
}

/** Cartão tracejado de recurso que ainda não existe (ex.: "Valor na FIPE · Em breve"). */
export function TeaserCard({ icon, title, hint, right }: TeaserCardProps) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${hint}`}>
      <IconAvatar
        icon={icon}
        size={36}
        iconSize={18}
        background={colors.accent}
        color={colors.onAccent}
      />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="text2">
          {hint}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  texts: { flex: 1, gap: 2 },
});
