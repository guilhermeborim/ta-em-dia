import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  text: string;
  /** Ação principal (botão lima). Sem ela, o cartão só informa. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Cartão de estado vazio: círculo lima com ícone, título, texto e ação opcional. */
export function EmptyState({ icon, title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.circle}>
        <Icon name={icon} size={40} color={colors.onAccent} />
      </View>
      <Text variant="h2" style={styles.center}>
        {title}
      </Text>
      <Text variant="body" color="text2" style={styles.center}>
        {text}
      </Text>
      {actionLabel ? <Button label={actionLabel} variant="accent" onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: spacing.md,
    paddingTop: 32,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  circle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  center: { textAlign: 'center' },
});
