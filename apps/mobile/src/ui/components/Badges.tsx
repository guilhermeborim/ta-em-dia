import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text, type TextColor } from './Text';

/** Selo "PREMIUM" (lima, com coroa). */
export function PremiumBadge() {
  return (
    <View style={[styles.pill, styles.premium]}>
      <Icon name="crown" size={12} color={colors.onAccent} />
      <Text variant="caption" color="onAccent">
        PREMIUM
      </Text>
    </View>
  );
}

/** Selo "Seu": marca um tipo criado pela própria pessoa. */
export function OwnBadge() {
  return (
    <View style={[styles.pill, styles.own]}>
      <Text variant="caption" color="text2">
        Seu
      </Text>
    </View>
  );
}

export type StatusTone = 'ok' | 'warning' | 'danger' | 'none';

const tones: Record<StatusTone, { background: string; color: string; text: TextColor }> = {
  ok: { background: colors.successSoft, color: colors.success, text: 'success' },
  warning: { background: colors.warningSoft, color: colors.warning, text: 'warning' },
  danger: { background: colors.dangerSoft, color: colors.danger, text: 'danger' },
  none: { background: colors.surface2, color: colors.text2, text: 'text2' },
};

interface StatusPillProps {
  tone: StatusTone;
  /** Ex.: "Em dia", "Vence em 12 dias", "Vencido", "Sem alerta". */
  label: string;
}

/** Status de manutenção ou documento: ponto colorido + texto. */
export function StatusPill({ tone, label }: StatusPillProps) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, styles.status, { backgroundColor: t.background }]}>
      <View style={[styles.dot, { backgroundColor: t.color }]} />
      <Text variant="caption" color={t.text}>
        {label}
      </Text>
    </View>
  );
}

const sync: Record<'synced' | 'local', { icon: IconName; label: string }> = {
  synced: { icon: 'cloud', label: 'Sincronizado' },
  local: { icon: 'cloud-off', label: 'Salvo no aparelho' },
};

/** Estado do backup: "Sincronizado" ou "Salvo no aparelho". `label` troca o texto (ex.: "No aparelho"). */
export function SyncPill({ state, label }: { state: 'synced' | 'local'; label?: string }) {
  const s = sync[state];
  return (
    <View style={[styles.pill, styles.status, { backgroundColor: colors.surface2 }]}>
      <Icon name={s.icon} size={14} color={colors.text2} />
      <Text variant="caption" color="text2">
        {label ?? s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  premium: { gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.accent },
  own: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
