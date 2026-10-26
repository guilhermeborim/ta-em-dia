import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { ListeningDots } from './ListeningDots';
import { Text } from './Text';

interface ListeningOverlayProps {
  visible: boolean;
  /** Tocar em qualquer lugar da tela. */
  onPress: () => void;
}

/** Tela inteira escurecida com os três pontinhos no centro: "ouvindo" enquanto a pessoa fala. */
export function ListeningOverlay({ visible, onPress }: ListeningOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onPress}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Parar de ouvir"
        accessibilityLiveRegion="polite"
        onPress={onPress}
        style={styles.fill}
      >
        <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <ListeningDots color={colors.accent} dot={16} />
        <Text variant="body" color="surface" style={styles.hint}>
          Toque para terminar
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  // Camada à parte: a opacidade escurece o fundo sem apagar os pontinhos.
  backdrop: { backgroundColor: colors.text, opacity: 0.88 },
  hint: { opacity: 0.8 },
});
