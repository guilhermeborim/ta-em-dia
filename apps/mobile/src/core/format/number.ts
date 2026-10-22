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

/** "R$ 229,10". */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
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
