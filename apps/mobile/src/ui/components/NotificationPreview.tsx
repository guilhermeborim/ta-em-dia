import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Logo } from './Logo';
import { Text } from './Text';

interface NotificationPreviewProps {
  title: string;
  text: string;
  /** Versão esmaecida, para empilhar atrás da principal. */
  dimmed?: boolean;
}

/** Exemplo de notificação do app: ícone, "TÁ EM DIA", título e texto. */
export function NotificationPreview({ title, text, dimmed = false }: NotificationPreviewProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Exemplo de notificação: ${title}. ${text}`}
      style={[styles.card, dimmed && styles.dimmed]}
    >
      <Logo size={36} />
      <View style={styles.texts}>
        <View style={styles.header}>
          <Text variant="caption" color="text3">
            TÁ EM DIA
          </Text>
          <Text variant="caption" color="text3">
            agora
          </Text>
        </View>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="text2">
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  dimmed: { opacity: 0.7 },
  texts: { flex: 1, gap: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
});
