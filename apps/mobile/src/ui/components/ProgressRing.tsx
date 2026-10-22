import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface ProgressRingProps {
  /** De 0 a 1. */
  progress: number;
  /** Cor do arco (ex.: a do estado: verde, laranja ou vermelho). */
  color: string;
  /** Lado do anel (pt). Padrão: 170. */
  size?: number;
  strokeWidth?: number;
  /** Conteúdo no centro (número e legenda). */
  children?: ReactNode;
}

/** Anel de progresso: trilho claro, arco colorido a partir do topo e conteúdo no centro. */
export function ProgressRing({
  progress,
  color,
  size = 170,
  strokeWidth = 16,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * fill} ${circumference}`}
          // Começa no topo (12 h) e segue no sentido horário.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
