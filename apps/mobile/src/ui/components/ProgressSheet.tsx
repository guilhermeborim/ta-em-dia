import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ProgressSheetProps {
  visible: boolean;
  title: string;
  text: string;
  icon?: IconName;
  /** Voltar do Android. Sem ele, a folha não fecha (o app está trabalhando). */
  onRequestClose?: () => void;
}

/**
 * Folha de baixo para cima que avisa que o app está trabalhando (ex.: "Baixando seus dados"), no
 * estilo da tela 24: fundo escurecido, avatar de ícone, título e texto, com um indicador de espera.
 */
export function ProgressSheet({
  visible,
  title,
  text,
  icon = 'cloud',
  onRequestClose,
}: ProgressSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onRequestClose ?? (() => {})}
    >
      <View style={styles.backdrop} />
      <View style={styles.sheet} accessibilityViewIsModal accessibilityLiveRegion="polite">
        <View style={styles.handle} />
        <View style={styles.icon}>
          <Icon name={icon} size={28} color={colors.primary} />
        </View>
        <Text variant="h2" style={styles.center}>
          {title}
        </Text>
        <Text variant="body" color="text2" style={styles.center}>
          {text}
        </Text>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  center: { textAlign: 'center' },
  spinner: { marginTop: spacing.sm },
});
