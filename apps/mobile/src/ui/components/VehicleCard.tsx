import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { StatusPill, type StatusTone } from './Badges';
import { Icon } from './Icon';
import { Text } from './Text';

/** Cores da faixa do cartão (Figma): os cartões alternam entre elas. */
const accents = {
  primary: { background: colors.primarySoft, icon: colors.primary },
  oil: { background: colors.warningSoft, icon: colors.oil },
} as const;

export type VehicleCardAccent = keyof typeof accents;

interface VehicleCardProps {
  name: string;
  /** Ex.: "VW Gol 1.0 · 2019 · 48.910 km". */
  details: string;
  accent?: VehicleCardAccent;
  /** Selo de situação. Sem lembretes, omita. */
  status?: { tone: StatusTone; label: string };
  onPress?: () => void;
  onLongPress?: () => void;
  /** Mudar a ordem por leitor de tela (no toque, é segurar o cartão). */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  accessibilityHint?: string;
}

/** Cartão de veículo (Meus veículos): faixa colorida com ícone, apelido, detalhes e selo. */
export function VehicleCard({
  name,
  details,
  accent = 'primary',
  status,
  onPress,
  onLongPress,
  onMoveUp,
  onMoveDown,
  accessibilityHint,
}: VehicleCardProps) {
  const color = accents[accent];
  const actions = [
    ...(onMoveUp ? [{ name: 'moveUp', label: 'Mover para cima' }] : []),
    ...(onMoveDown ? [{ name: 'moveDown', label: 'Mover para baixo' }] : []),
  ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status ? `${name}, ${details}, ${status.label}` : `${name}, ${details}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      accessibilityActions={actions.length > 0 ? actions : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMoveUp?.();
        if (event.nativeEvent.actionName === 'moveDown') onMoveDown?.();
      }}
      onLongPress={onLongPress}
      style={styles.card}
    >
      <View style={[styles.photo, { backgroundColor: color.background }]}>
        <Icon name="car" size={64} color={color.icon} />
      </View>
      <View style={styles.footer}>
        <View style={styles.texts}>
          <Text variant="h2" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="small" color="text2" numberOfLines={1}>
            {details}
          </Text>
        </View>
        {status ? <StatusPill tone={status.tone} label={status.label} /> : null}
      </View>
    </Pressable>
  );
}

interface DashedAddCardProps {
  label: string;
  onPress?: () => void;
}

/** Cartão tracejado de adicionar (ex.: "Adicionar veículo"). */
export function DashedAddCard({ label, onPress }: DashedAddCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.add}
    >
      <Icon name="plus" size={20} color={colors.primary} />
      <Text variant="bodyStrong" color="primary">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 22, backgroundColor: colors.surface },
  photo: { height: 120, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  texts: { flex: 1, gap: 2 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
});
