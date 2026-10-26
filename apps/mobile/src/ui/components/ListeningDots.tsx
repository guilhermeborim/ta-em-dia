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

const DOT = 6;
const STEP_MS = 300;

function Dot({ index, color }: { index: number; color: string }) {
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
    transform: [{ translateY: -lift.value * 4 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Três pontinhos pulando em sequência: "ouvindo" no botão de falar. */
export function ListeningDots({ color = colors.text }: { color?: string }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, height: DOT + 8 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
