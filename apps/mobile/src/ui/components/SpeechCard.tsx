import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/tokens';
import { Button, type ButtonVariant } from './Button';
import { Icon, type IconName } from './Icon';
import { Text, type TextColor } from './Text';

export type SpeechCardTone = 'info' | 'success' | 'warning' | 'danger';

export interface SpeechCardAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

interface SpeechCardProps {
  tone: SpeechCardTone;
  title: string;
  /** Texto ao vivo da fala, o resumo do que foi salvo ou uma explicação. */
  text?: string;
  actions?: SpeechCardAction[];
}

const tones: Record<SpeechCardTone, { icon: IconName; color: TextColor; soft: string }> = {
  info: { icon: 'shield', color: 'primary', soft: colors.primarySoft },
  success: { icon: 'check', color: 'success', soft: colors.successSoft },
  warning: { icon: 'alert', color: 'warning', soft: colors.warningSoft },
  danger: { icon: 'alert', color: 'danger', soft: colors.dangerSoft },
};

/** Cartão do registro por voz: aviso, pergunta, resumo salvo ou falha, com botões. */
export function SpeechCard({ tone, title, text, actions = [] }: SpeechCardProps) {
  const t = tones[tone];
  return (
    <View accessibilityLiveRegion="polite" style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.soft }]}>
          <Icon name={t.icon} size={20} color={colors[t.color]} />
        </View>
        <Text variant="bodyStrong" style={styles.title}>
          {title}
        </Text>
      </View>
      {text ? (
        <Text variant="body" color="text2">
          {text}
        </Text>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              onPress={action.onPress}
              variant={action.variant ?? 'secondary'}
              style={styles.action}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 120 },
});
