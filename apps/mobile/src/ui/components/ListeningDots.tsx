import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';

const STEP_MS = 300;

function Dot({ index, color, dot }: { index: number; color: string; dot: number }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withDelay(
      index * (STEP_MS / 2),
      withRepeat(
        withSequence(withTiming(1, { duration: STEP_MS }), withTiming(0, { duration: STEP_MS })),
        -1,
      ),
    );
  }, [index, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + lift.value * 0.6,
    transform: [{ translateY: -lift.value * dot * 0.7 }],
  }));

  return (
    <Animated.View
      style={[{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }, style]}
    />
  );
}

/** Três pontinhos pulando em sequência: "ouvindo" enquanto a pessoa fala. */
export function ListeningDots({
  color = colors.text,
  dot = 6,
}: {
  color?: string;
  /** Diâmetro de cada ponto, em pt. */
  dot?: number;
}) {
  return (
    <View
      style={[styles.row, { gap: dot * 0.7, height: dot * 2.4 }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} color={color} dot={dot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
