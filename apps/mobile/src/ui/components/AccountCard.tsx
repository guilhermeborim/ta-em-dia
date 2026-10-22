import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { SyncPill } from './Badges';
import { Icon } from './Icon';
import { Text } from './Text';

interface AccountCardProps {
  /** Ex.: "Guilherme" ou "Sem login". */
  name: string;
  /** "Sincronizado" (conta na nuvem) ou "Salvo no aparelho" (sem login). */
  sync: 'synced' | 'local';
  /** Troca o texto do selo. */
  syncLabel?: string;
  onPress?: () => void;
}

/** Cartão da conta no topo de Mais: avatar, nome, estado do backup e seta. */
export function AccountCard({ name, sync, syncLabel, onPress }: AccountCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. Conta`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.avatar}>
        <Icon name="user" size={26} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text variant="h3" numberOfLines={1}>
          {name}
        </Text>
        <SyncPill state={sync} label={syncLabel} />
      </View>
      <Icon name="chevron-right" size={20} color={colors.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  texts: { flex: 1, gap: 4 },
});
