import { dropIndex, itemTops, shiftFor } from '../reorder';

// Três cartões de 100 pt com 10 pt entre eles: topos em 0, 110 e 220.
const heights = [100, 100, 100];
const gap = 10;

describe('itemTops', () => {
  it('soma as alturas e o espaço entre os itens', () => {
    expect(itemTops(heights, gap)).toEqual([0, 110, 220]);
    expect(itemTops([80, 120], 10)).toEqual([0, 90]);
    expect(itemTops([], 10)).toEqual([]);
  });
});

describe('dropIndex', () => {
  it('sem arrastar, fica no lugar', () => {
    expect(dropIndex(0, 0, heights, gap)).toBe(0);
    expect(dropIndex(1, 0, heights, gap)).toBe(1);
    expect(dropIndex(2, 0, heights, gap)).toBe(2);
  });

  it('desce quando o centro passa da metade do espaço do vizinho', () => {
    // Centro do primeiro: 50. Até 105 (fim do primeiro + metade do espaço) ainda é o primeiro.
    expect(dropIndex(0, 50, heights, gap)).toBe(0);
    expect(dropIndex(0, 56, heights, gap)).toBe(1);
    expect(dropIndex(0, 160, heights, gap)).toBe(1);
    expect(dropIndex(0, 170, heights, gap)).toBe(2);
  });

  it('sobe quando o centro passa para cima do vizinho', () => {
    expect(dropIndex(2, -56, heights, gap)).toBe(1);
    expect(dropIndex(2, -170, heights, gap)).toBe(0);
  });

  it('nunca sai dos limites da lista', () => {
    expect(dropIndex(0, -500, heights, gap)).toBe(0);
    expect(dropIndex(2, 500, heights, gap)).toBe(2);
  });

  it('alturas diferentes entram na conta', () => {
    // 60 e 200: topos 0 e 70; o primeiro só passa quando o centro (30 + dy) chega a 65.
    expect(dropIndex(0, 30, [60, 200], 10)).toBe(0);
    expect(dropIndex(0, 40, [60, 200], 10)).toBe(1);
  });

  it('sem medidas (ainda sem layout) ou índice fora, não se mexe', () => {
    expect(dropIndex(0, 100, [], gap)).toBe(0);
    expect(dropIndex(5, 100, heights, gap)).toBe(5);
    expect(dropIndex(-1, 100, heights, gap)).toBe(-1);
  });
});

describe('shiftFor', () => {
  it('arrastando o primeiro para a terceira posição, o segundo e o terceiro sobem', () => {
    const room = 100 + gap;
    expect(shiftFor(0, 0, 2, heights, gap)).toBe(0);
    expect(shiftFor(1, 0, 2, heights, gap)).toBe(-room);
    expect(shiftFor(2, 0, 2, heights, gap)).toBe(-room);
  });

  it('arrastando o último para o começo, os outros descem', () => {
    const room = 100 + gap;
    expect(shiftFor(0, 2, 0, heights, gap)).toBe(room);
    expect(shiftFor(1, 2, 0, heights, gap)).toBe(room);
    expect(shiftFor(2, 2, 0, heights, gap)).toBe(0);
  });

  it('quem está fora do trecho não anda; sem item arrastado, ninguém anda', () => {
    expect(shiftFor(2, 0, 1, heights, gap)).toBe(0);
    expect(shiftFor(0, 1, 1, heights, gap)).toBe(0);
    expect(shiftFor(1, -1, -1, heights, gap)).toBe(0);
  });

  it('o espaço aberto é a altura do item arrastado', () => {
    expect(shiftFor(1, 0, 1, [60, 200], 10)).toBe(-70);
  });
});
