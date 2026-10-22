import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, size, spacing } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface TopBarProps {
  title: string;
  onBack: () => void;
  /** Selo ao lado do título (ex.: "Seu"). */
  badge?: ReactNode;
  /** Botão redondo à direita (ex.: adicionar, editar, período). */
  action?: {
    icon: IconName;
    label: string;
    onPress: () => void;
    /** Fundo roxo claro e ícone roxo, para mostrar que há filtro ligado. */
    active?: boolean;
    expanded?: boolean;
  };
}

/** Barra de topo das telas empilhadas: voltar, título e uma ação opcional. */
export function TopBar({ title, onBack, badge, action }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={onBack}
        style={styles.round}
      >
        <Icon name="chevron-left" size={22} color={colors.text} />
      </Pressable>
      <Text variant="h2" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {badge}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={
            action.expanded === undefined ? undefined : { expanded: action.expanded }
          }
          onPress={action.onPress}
          style={[styles.round, action.active && styles.active]}
        >
          <Icon name={action.icon} size={20} color={action.active ? colors.primary : colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  round: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  active: { backgroundColor: colors.primarySoft },
  title: { flex: 1 },
});
