/**
 * Contas do arrastar para reordenar (`ReorderableList`). Funções puras e marcadas como worklet,
 * porque rodam na thread de UI durante o gesto.
 */

/** Topo de cada item (px), com `gap` entre eles. */
export function itemTops(heights: number[], gap: number): number[] {
  'worklet';
  const tops: number[] = [];
  let y = 0;
  for (const height of heights) {
    tops.push(y);
    y += height + gap;
  }
  return tops;
}

/**
 * Para onde o item `from` iria se fosse solto depois de arrastar `dy` px: o item em cujo espaço cai
 * o centro do item arrastado. Fica entre 0 e o último item. Sem medidas, não sai do lugar.
 */
export function dropIndex(from: number, dy: number, heights: number[], gap: number): number {
  'worklet';
  const last = heights.length - 1;
  if (from < 0 || from > last) return from;
  const tops = itemTops(heights, gap);
  const center = tops[from]! + heights[from]! / 2 + dy;
  for (let i = 0; i < last; i++) {
    if (center < tops[i]! + heights[i]! + gap / 2) return i;
  }
  return last;
}

/**
 * Quanto (px) o item `index` sobe ou desce para abrir espaço enquanto `from` é arrastado para
 * `to`: os que ficam entre os dois andam um espaço do item arrastado.
 */
export function shiftFor(
  index: number,
  from: number,
  to: number,
  heights: number[],
  gap: number,
): number {
  'worklet';
  if (index === from || from < 0) return 0;
  const room = (heights[from] ?? 0) + gap;
  if (from < index && index <= to) return -room;
  if (to <= index && index < from) return room;
  return 0;
}
