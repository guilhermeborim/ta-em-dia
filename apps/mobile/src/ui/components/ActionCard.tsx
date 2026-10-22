import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface ActionCardProps {
  icon: IconName;
  title: string;
  text: string;
  /** `soft`: fundo roxo claro (chamada). `surface`: fundo branco (lembrete). */
  tone?: 'soft' | 'surface';
  /** Cores do avatar. Padrão: roxo com ícone branco. */
  avatarBackground?: string;
  avatarColor?: string;
  onPress?: () => void;
}

/** Cartão de chamada com avatar, título, texto e seta (ex.: "Salve seus dados na nuvem"). */
export function ActionCard({
  icon,
  title,
  text,
  tone = 'surface',
  avatarBackground = colors.primary,
  avatarColor = colors.onPrimary,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: tone === 'soft' ? colors.primarySoft : colors.surface },
      ]}
    >
      <IconAvatar
        icon={icon}
        size={40}
        iconSize={20}
        background={avatarBackground}
        color={avatarColor}
      />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="text2">
          {text}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  texts: { flex: 1, gap: 2 },
});
