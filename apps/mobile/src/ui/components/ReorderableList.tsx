import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { shadows } from '../theme/tokens';
import { dropIndex, shiftFor } from './reorder';

/** Quanto o dedo precisa ficar parado antes de o arrastar começar (rolar a tela não arrasta). */
const HOLD_MS = 250;

interface ReorderableListProps<T> {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** O item de `from` foi solto na posição `to`. A lista não se reordena sozinha: troque `data`. */
  onReorder: (from: number, to: number) => void;
  /** Espaço entre os itens (pt). */
  gap?: number;
  /** Desligado (ex.: um item só), os itens ficam parados. */
  enabled?: boolean;
}

/**
 * Lista em que se segura um item e arrasta para mudar a ordem: os outros abrem espaço enquanto o
 * dedo anda e, ao soltar, `onReorder` avisa de onde para onde. Use dentro de um `ScrollView` de
 * `react-native-gesture-handler` e de um `GestureHandlerRootView`. Não rola sozinha perto da borda.
 */
export function ReorderableList<T>({
  data,
  keyOf,
  renderItem,
  onReorder,
  gap = 12,
  enabled = true,
}: ReorderableListProps<T>) {
  const heights = useSharedValue<number[]>([]);
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);

  // A altura de cada item vem do layout, por chave (a ordem muda, a medida do item não).
  const measured = useRef(new Map<string, number>());
  const sync = useCallback(() => {
    heights.value = data.map((item) => measured.current.get(keyOf(item)) ?? 0);
  }, [data, heights, keyOf]);
  useEffect(sync, [sync]);

  return (
    <View style={{ gap }}>
      {data.map((item, index) => (
        <ReorderableItem
          key={keyOf(item)}
          index={index}
          gap={gap}
          enabled={enabled && data.length > 1}
          heights={heights}
          active={active}
          target={target}
          dragY={dragY}
          onReorder={onReorder}
          onMeasure={(height) => {
            measured.current.set(keyOf(item), height);
            sync();
          }}
        >
          {renderItem(item, index)}
        </ReorderableItem>
      ))}
    </View>
  );
}

interface ItemProps {
  index: number;
  gap: number;
  enabled: boolean;
  heights: SharedValue<number[]>;
  active: SharedValue<number>;
  target: SharedValue<number>;
  dragY: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onMeasure: (height: number) => void;
  children: ReactNode;
}

function ReorderableItem({
  index,
  gap,
  enabled,
  heights,
  active,
  target,
  dragY,
  onReorder,
  onMeasure,
  children,
}: ItemProps) {
  const pan = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => {
      active.value = index;
      target.value = index;
      dragY.value = 0;
    })
    .onUpdate((event) => {
      dragY.value = event.translationY;
      target.value = dropIndex(index, event.translationY, heights.value, gap);
    })
    .onEnd(() => {
      if (target.value !== index) scheduleOnRN(onReorder, index, target.value);
    })
    .onFinalize(() => {
      active.value = -1;
      target.value = -1;
      dragY.value = 0;
    });

  const style = useAnimatedStyle(() => {
    if (active.value === index) {
      return {
        ...shadows.card,
        zIndex: 10,
        transform: [{ translateY: dragY.value }, { scale: 1.02 }],
      };
    }
    const shift = shiftFor(index, active.value, target.value, heights.value, gap);
    return { zIndex: 0, transform: [{ translateY: withTiming(shift, { duration: 150 }) }] };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style} onLayout={(event) => onMeasure(event.nativeEvent.layout.height)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
