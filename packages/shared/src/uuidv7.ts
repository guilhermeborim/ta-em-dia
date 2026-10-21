/**
 * UUID v7 (RFC 9562): 48 bits de timestamp em ms + 74 bits aleatórios.
 * Pura: o chamador passa o relógio e 10 bytes aleatórios, assim o teste é
 * determinístico e cada plataforma usa a sua fonte de aleatoriedade.
 */
export function uuidv7(nowMs: number, random: Uint8Array): string {
  if (random.length < 10) throw new Error('uuidv7 precisa de 10 bytes aleatórios');

  const bytes = new Uint8Array(16);
  let ts = Math.floor(nowMs);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }
  bytes.set(random.subarray(0, 10), 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // versão 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
