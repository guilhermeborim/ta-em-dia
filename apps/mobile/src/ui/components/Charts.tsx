import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { Text } from './Text';

/** Categorias do gráfico de barras: cor de cada uma (Figma: chart-fuel, chart-maint). */
const categoryColor = { fuel: colors.chartFuel, maint: colors.chartMaint } as const;

export type ChartCategory = keyof typeof categoryColor;

export interface StackedBar {
  key: string;
  /** Ex.: "out". */
  label: string;
  /** Destaca o rótulo (o mês atual). */
  current?: boolean;
  /** Do fundo para o topo. Valor zero não desenha. */
  parts: { category: ChartCategory; value: number }[];
}

interface StackedBarChartProps {
  bars: StackedBar[];
  legend: { category: ChartCategory; label: string }[];
  /** Altura da área das barras (pt). */
  height?: number;
}

const GAP = 2;
const MAX_BAR_WIDTH = 28;

/** Barras empilhadas por categoria, com os meses embaixo e a legenda. A maior barra enche a altura. */
export function StackedBarChart({ bars, legend, height = 150 }: StackedBarChartProps) {
  const max = Math.max(
    0,
    ...bars.map((bar) => bar.parts.reduce((sum, part) => sum + part.value, 0)),
  );
  const label = bars
    .map(
      (bar) =>
        `${bar.label}: ${Math.round(bar.parts.reduce((sum, part) => sum + part.value, 0))} reais`,
    )
    .join(', ');

  return (
    <View style={styles.chart}>
      <View
        accessible
        accessibilityLabel={`Gasto por mês. ${label}`}
        style={[styles.bars, { height }]}
      >
        {bars.map((bar) => {
          const visible = bar.parts.filter((part) => part.value > 0);
          // Os espaços entre as partes não podem estourar a altura.
          const room = height - 20 - GAP * Math.max(0, visible.length - 1);
          return (
            <View key={bar.key} style={styles.column}>
              <View style={styles.stack}>
                {[...visible].reverse().map((part) => (
                  <View
                    key={part.category}
                    style={[
                      styles.part,
                      {
                        height: Math.max(4, (part.value / max) * room),
                        backgroundColor: categoryColor[part.category],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text variant="caption" color={bar.current ? 'text' : 'text3'}>
                {bar.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.category} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: categoryColor[item.category] }]} />
            <Text variant="small" color="text2">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface LineChartProps {
  /** `x` de 0 a 1 (da esquerda para a direita) e o valor, ordenados por `x`. */
  points: { x: number; value: number }[];
  /** Rótulos embaixo, distribuídos de ponta a ponta (ex.: os meses). */
  labels: string[];
  height?: number;
}

const PAD = 6;

/** Linha com um ponto por valor; a escala vai do menor ao maior valor. Precisa de 2 pontos ou mais. */
export function LineChart({ points, labels, height = 80 }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;

  const coords = points.map((p) => ({
    x: PAD + p.x * Math.max(0, width - PAD * 2),
    y: PAD + (1 - (p.value - min) / span) * (height - PAD * 2),
  }));

  return (
    <View>
      <View
        accessible
        accessibilityLabel={`Consumo por trecho: de ${min.toFixed(1)} a ${(min + span).toFixed(1)} quilômetros por litro`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coords.map((c, index) => (
              <Circle key={index} cx={c.x} cy={c.y} r={3.5} fill={colors.primary} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} variant="caption" color="text3">
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  stack: { alignItems: 'center', gap: GAP },
  part: { width: '100%', maxWidth: MAX_BAR_WIDTH, borderRadius: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
