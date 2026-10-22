const onlyDigits = (text: string) => text.replace(/\D/g, '');

/** Aceita "48.320" ou "48320"; devolve `null` se vazio. */
export function parseKm(text: string): number | null {
  const digits = onlyDigits(text);
  return digits === '' ? null : Number(digits);
}

export function formatKm(text: string): string {
  const km = parseKm(text);
  return km === null ? '' : new Intl.NumberFormat('pt-BR').format(km);
}

const nbsp = /\u00a0/g;

/** "R$ 229,10" (ou "R$ 1.090" com `fractionDigits` 0). */
export function formatBRL(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .format(value)
    .replace(nbsp, ' ');
}

/** Número em pt-BR com casas fixas ou variáveis. Ex.: `formatNumber(12.43, 1)` → "12,4". */
export function formatNumber(
  value: number,
  minDecimals: number,
  maxDecimals = minDecimals,
): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })
    .format(value)
    .replace(nbsp, ' ');
}

/** Texto do campo: só dígitos e uma vírgula, com no máximo `maxDecimals` casas. */
export function sanitizeDecimal(text: string, maxDecimals: number): string {
  const [int = '', ...rest] = text
    .replace(/\./g, ',')
    .replace(/[^\d,]/g, '')
    .split(',');
  if (rest.length === 0) return int;
  return `${int},${rest.join('').slice(0, maxDecimals)}`;
}

/** Aceita "5,99" ou "5.99" (teclado numérico); devolve `null` se vazio ou inválido. */
export function parseDecimal(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || !Number.isFinite(value) ? null : value;
}
