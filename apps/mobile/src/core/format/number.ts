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
