import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, radius, spacing, Text } from '../../../ui';
import { useOnboardingViewModel } from '../viewmodels/useOnboardingViewModel';
import { OnboardingIllustration } from './OnboardingIllustrations';

const ILLUSTRATION_HEIGHT = 360;

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Página ${active + 1} de ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

export function OnboardingView() {
  const vm = useOnboardingViewModel();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);

  // Mantém a página alinhada quando o botão "Avançar" muda o slide.
  useEffect(() => {
    scroll.current?.scrollTo({ x: vm.index * width, animated: true });
  }, [vm.index, width]);

  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    vm.setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <Button label="Pular" variant="ghost" onPress={vm.skip} style={styles.skip} />
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSwipeEnd}
        style={styles.pager}
      >
        {vm.slides.map((slide) => (
          <View key={slide.id} style={[styles.page, { width }]}>
            <View style={styles.illustration}>
              <OnboardingIllustration id={slide.id} />
            </View>
            <View style={styles.texts}>
              <Text variant="h1">{slide.title}</Text>
              <Text variant="body" color="text2">
                {slide.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Dots count={vm.slides.length} active={vm.index} />
        <Button label={vm.primaryLabel} onPress={vm.next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  skipRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, alignItems: 'flex-end' },
  skip: { height: 44, paddingHorizontal: spacing.lg },
  pager: { flex: 1 },
  page: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl },
  illustration: {
    height: ILLUSTRATION_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  texts: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.xl },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
});
