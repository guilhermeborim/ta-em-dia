import { formatNumber, parseKm } from '../../../core/format';

export { formatKm } from '../../../core/format';

/** Acima disso, é erro de digitação (nenhum veículo roda tanto). */
const MAX_KM = 2_000_000;

/** Valida o km digitado: obrigatório e nunca menor que o km atual (igual vale, confirma o km). */
export function buildKmInput(
  text: string,
  currentKm: number,
): { km: number; error?: undefined } | { km?: undefined; error: string } {
  const km = parseKm(text);
  if (km === null) return { error: 'Informe o km do painel' };
  if (km < currentKm) {
    return { error: `O km não pode ser menor que o atual (${formatNumber(currentKm, 0)} km)` };
  }
  if (km > MAX_KM) return { error: 'Km inválido' };
  return { km };
}
