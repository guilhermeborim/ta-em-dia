import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from '../theme/tokens';
import { OwnBadge, StatusPill, type StatusTone } from './Badges';
import type { IconName } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text, type TextColor } from './Text';

const toneStyle: Record<
  Exclude<StatusTone, 'none'>,
  { soft: string; strong: string; text: TextColor }
> = {
  ok: { soft: colors.successSoft, strong: colors.success, text: 'success' },
  warning: { soft: colors.warningSoft, strong: colors.warning, text: 'warning' },
  danger: { soft: colors.dangerSoft, strong: colors.danger, text: 'danger' },
};

interface AlertCardProps {
  tone: Exclude<StatusTone, 'none'>;
  icon: IconName;
  /** Ex.: "Troca de óleo". */
  title: string;
  /** Ex.: "10.000 km ou 12 meses". */
  subtitle: string;
  /** Texto do status. Ex.: "Em dia", "Vence em 12 dias", "Vencido". */
  status: string;
  /** Quanto do intervalo já passou, de 0 a 1. Acima de 1 a barra fica cheia. */
  progress: number;
  /** Ex.: "8.600 de 10.000 km". */
  progressLabel: string;
  /** Ex.: "≈ 500 km · 12 dias" ou "Toque para resolver". */
  hint: string;
  onPress?: () => void;
}

/** Cartão de alerta de manutenção ou documento, com barra de progresso colorida pelo estado. */
export function AlertCard({
  tone,
  icon,
  title,
  subtitle,
  status,
  progress,
  progressLabel,
  hint,
  onPress,
}: AlertCardProps) {
  const t = toneStyle[tone];
  const fill = Math.min(Math.max(progress, 0), 1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      onPress={onPress}
      style={[styles.card, shadows.card]}
    >
      <View style={styles.header}>
        <IconAvatar icon={icon} size={40} iconSize={20} background={t.soft} color={t.strong} />
        <View style={styles.titles}>
          <Text variant="h3">{title}</Text>
          <Text variant="small" color="text2">
            {subtitle}
          </Text>
        </View>
        <StatusPill tone={tone} label={status} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: t.strong }]} />
      </View>

      <View style={styles.footer}>
        <Text variant="small" color="text2">
          {progressLabel}
        </Text>
        <Text variant="small" color={t.text}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

interface NoIntervalCardProps {
  icon?: IconName;
  title: string;
  /** Tipo criado pela pessoa: mostra o selo "Seu". */
  own?: boolean;
  /** Ex.: "Última vez: 12 out · 50.110 km". */
  lastDone: string;
  onDefineInterval?: () => void;
}

/** Item de manutenção sem intervalo: só histórico, sem alerta. */
export function NoIntervalCard({
  icon = 'wrench',
  title,
  own = false,
  lastDone,
  onDefineInterval,
}: NoIntervalCardProps) {
  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.header}>
        <IconAvatar
          icon={icon}
          size={40}
          iconSize={20}
          background={colors.surface2}
          color={colors.text2}
        />
        <View style={styles.titles}>
          <View style={styles.titleRow}>
            <Text variant="h3">{title}</Text>
            {own ? <OwnBadge /> : null}
          </View>
          <View style={styles.titleRow}>
            <StatusPill tone="none" label="Sem alerta" />
            <Text variant="small" color="text2">
              Só histórico
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text variant="small" color="text2">
          {lastDone}
        </Text>
        <Pressable accessibilityRole="button" onPress={onDefineInterval}>
          <Text variant="bodyStrong" color="primary">
            Definir intervalo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
  },
  fill: { height: 8, borderRadius: radius.pill },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
