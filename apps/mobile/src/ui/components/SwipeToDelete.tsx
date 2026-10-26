import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, size } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

interface SwipeToDeleteProps {
  children: ReactNode;
  /**
   * A pessoa arrastou o item para a esquerda até abrir o "Excluir". `close` fecha o item de volta
   * (use ao cancelar a confirmação).
   */
  onOpen: (close: () => void) => void;
}

const ACTION_WIDTH = 88;

/** Item que se arrasta para a esquerda e mostra "Excluir" em vermelho. A exclusão em si é de quem usa. */
export function SwipeToDelete({ children, onOpen }: SwipeToDeleteProps) {
  const ref = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      onSwipeableOpen={() => onOpen(() => ref.current?.close())}
      renderRightActions={() => (
        <View style={styles.action}>
          <Icon name="trash" size={22} color={colors.onPrimary} />
          <Text variant="caption" color="onPrimary">
            Excluir
          </Text>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: ACTION_WIDTH,
    minHeight: size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.danger,
  },
});
