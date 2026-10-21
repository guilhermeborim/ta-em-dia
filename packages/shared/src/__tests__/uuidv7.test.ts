import { describe, expect, it } from 'vitest';
import { uuidv7 } from '../uuidv7';
import { vehicleSchema } from '../schemas';

const zeros = new Uint8Array(10);
const ones = new Uint8Array(10).fill(0xff);

describe('uuidv7', () => {
  it('tem versão 7 e variante RFC', () => {
    const id = uuidv7(1_700_000_000_000, ones);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('codifica o timestamp nos 48 primeiros bits', () => {
    // 0x018bcfe56800 = 1_700_000_000_000
    expect(uuidv7(1_700_000_000_000, zeros).startsWith('018bcfe5-6800-7')).toBe(true);
  });

  it('ordena pelo tempo', () => {
    const a = uuidv7(1_700_000_000_000, ones);
    const b = uuidv7(1_700_000_000_001, zeros);
    expect(a < b).toBe(true);
  });

  it('passa na validação do schema (z.uuid)', () => {
    const id = uuidv7(Date.now(), ones);
    expect(vehicleSchema.shape.id.safeParse(id).success).toBe(true);
  });

  it('exige 10 bytes aleatórios', () => {
    expect(() => uuidv7(0, new Uint8Array(4))).toThrow();
  });
});
