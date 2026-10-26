import { calculateMissingFuelAmount, type FuelAmountField } from './calculations';
import {
  FUEL_AMOUNT_TOLERANCE,
  FUEL_MAX_KM_JUMP,
  FUEL_PRICE_MAX,
  FUEL_PRICE_MIN,
} from './fuelDraft';
import type { FuelEntry } from './schemas';

/**
 * Interpretador da frase falada no posto ("abasteci 150 reais, 25 litros, km 45300, encheu o
 * tanque"). Puro: recebe o texto que o reconhecimento de fala do sistema devolveu e devolve os
 * campos do abastecimento. Não grava nada nem valida faixas (isso é `fuelEntryIssues`).
 *
 * Como decide qual número é qual:
 * 1. Palavra junto do número manda: "150 reais", "25 litros", "45 mil km", "6,29 o litro",
 *    "o litro a 6,29", "paguei 150", "hodômetro 45300".
 * 2. Número sem palavra: inteiro de 1.000 para cima (ou perto e acima do último km) é km; com
 *    centavos entre R$ 2 e R$ 12 é o preço do litro.
 * 3. Sobrando valor e litros sem palavra: o par que dá valor ÷ litros entre R$ 2 e R$ 12 decide.
 * 4. Não deu para decidir (um número só, ou a conta não fecha): devolve uma pergunta. O app
 *    mostra a pergunta e repete a chamada com a resposta em `answers`.
 */

export type FuelSpeechFuelType = FuelEntry['fuelType'];

/** Campo numérico que um número falado pode preencher. */
export type FuelSpeechField = FuelAmountField | 'km';

export interface FuelSpeechContext {
  /** Km do último abastecimento completo do veículo (ou o km atual), se houver. */
  lastKm?: number | null;
  /** Combustível do último abastecimento: vale quando a pessoa não diz qual foi. */
  lastFuelType?: FuelSpeechFuelType | null;
}

export interface FuelSpeechFields {
  total?: number;
  liters?: number;
  pricePerLiter?: number;
  km?: number;
  fuelType?: FuelSpeechFuelType;
  /** `true` encheu, `false` não encheu; ausente = a pessoa não falou. */
  fullTank?: boolean;
}

export interface FuelSpeechQuestion {
  /** Identifica o número na frase: volta em `answers` para a próxima chamada. */
  id: number;
  number: number;
  options: FuelSpeechField[];
  /** Ex.: "50 é o valor ou os litros?". */
  text: string;
}

export interface FuelSpeechResult {
  fields: FuelSpeechFields;
  /** Valor que o interpretador calculou a partir dos outros dois (valor, litros ou preço). */
  calculated: FuelAmountField | null;
  /** O combustível veio do último abastecimento, não da frase. */
  fuelTypeFromContext: boolean;
  /** Número que não deu para decidir; `null` se tudo foi entendido. */
  question: FuelSpeechQuestion | null;
}

/** Respostas às perguntas anteriores, pelo `id` do número. */
export type FuelSpeechAnswers = Record<number, FuelSpeechField>;

const FIELD_LABELS: Record<FuelSpeechField, string> = {
  total: 'o valor',
  liters: 'os litros',
  pricePerLiter: 'o preço do litro',
  km: 'o km',
};

/* ------------------------------------------------------------------ texto → palavras */

function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/r\s*\$/g, ' rs ')
    .replace(/[^a-z0-9.,/ ]/g, ' ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/\//g, ' ')
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ números por extenso */

const UNITS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
};
const TEENS: Record<string, number> = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezasseis: 16,
  dezessete: 17,
  dezassete: 17,
  dezoito: 18,
  dezenove: 19,
  dezanove: 19,
};
const TENS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
};

type WordKind = 'unit' | 'teen' | 'ten' | 'hundred';
type GroupState = WordKind | 'none';

function wordKind(word: string): { kind: WordKind; value: number } | null {
  if (word in UNITS) return { kind: 'unit', value: UNITS[word]! };
  if (word in TEENS) return { kind: 'teen', value: TEENS[word]! };
  if (word in TENS) return { kind: 'ten', value: TENS[word]! };
  if (word in HUNDREDS) return { kind: 'hundred', value: HUNDREDS[word]! };
  return null;
}

/** Cada parte só pode vir depois de uma maior: centena, dezena, unidade ("cento e vinte e cinco"). */
function fits(kind: WordKind, last: GroupState): boolean {
  switch (kind) {
    case 'hundred':
      return last === 'none';
    case 'ten':
    case 'teen':
      return last === 'none' || last === 'hundred';
    case 'unit':
      return last === 'none' || last === 'hundred' || last === 'ten';
  }
}

const isNumberWord = (word: string | undefined): boolean =>
  word !== undefined && (wordKind(word) !== null || word === 'mil');

/** Lê "quarenta e cinco mil e trezentos" a partir de `start`; para quando a ordem quebra. */
function parseWords(words: string[], start: number): { value: number; end: number } | null {
  let total = 0;
  let group = 0;
  let last: GroupState = 'none';
  let thousand = false;
  let any = false;
  let i = start;
  let end = start;

  while (i < words.length) {
    const j = words[i] === 'e' && any ? i + 1 : i;
    const word = words[j];
    if (word === undefined) break;

    if (word === 'mil') {
      if (thousand) break;
      total = (group === 0 ? 1 : group) * 1000;
      group = 0;
      last = 'none';
      thousand = true;
    } else {
      const part = wordKind(word);
      if (!part || !fits(part.kind, last)) break;
      group += part.value;
      last = part.kind;
    }
    any = true;
    i = j + 1;
    end = i;
  }
  return any ? { value: total + group, end } : null;
}

/* ------------------------------------------------------------------ itens da frase */

interface NumberItem {
  kind: 'num';
  id: number;
  value: number;
  /** "6.299" pode ser o preço 6,299; `alt` guarda essa leitura. */
  alt?: number;
}
interface WordItem {
  kind: 'word';
  w: string;
}
type Item = NumberItem | WordItem;

function parseDigits(token: string): { value: number; alt?: number } | null {
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) {
    const value = Number(token.replace(/\./g, ''));
    const alt =
      /^\d{1,2}\.\d{3}$/.test(token) && !token.endsWith('000') ? Number(token) : undefined;
    return { value, alt };
  }
  if (/^\d+([.,]\d+)?$/.test(token)) return { value: Number(token.replace(',', '.')) };
  return null;
}

const isDigits = (token: string | undefined): boolean =>
  token !== undefined && parseDigits(token) !== null;

/** Casas depois da vírgula falada: "vinte e nove" → "29", "zero cinco" → "05", "dois nove" → "29". */
function parseSpokenFraction(
  tokens: string[],
  start: number,
): { digits: string; end: number } | null {
  if (isDigits(tokens[start]) && /^\d+$/.test(tokens[start]!)) {
    return { digits: tokens[start]!, end: start + 1 };
  }
  let i = start;
  let digits = '';
  while (tokens[i] === 'zero') {
    digits += '0';
    i += 1;
  }
  const first = tokens[i];
  if (first !== undefined && first in UNITS) {
    // Um dígito por palavra ("seis vírgula dois nove").
    while (tokens[i] !== undefined && tokens[i]! in UNITS) {
      digits += String(UNITS[tokens[i]!]);
      i += 1;
    }
    return { digits, end: i };
  }
  const parsed = parseWords(tokens, i);
  if (!parsed) return digits === '' ? null : { digits, end: i };
  return { digits: digits + String(parsed.value), end: parsed.end };
}

function buildItems(tokens: string[]): Item[] {
  const items: Item[] = [];
  const push = (value: number, alt?: number) =>
    items.push({ kind: 'num', id: items.length, value, alt });

  /** "e 300" depois de "45 mil": a parte de baixo, em dígitos ou por extenso. */
  const lowerPart = (from: number): { value: number; end: number } | null => {
    const k = tokens[from] === 'e' ? from + 1 : from;
    const token = tokens[k];
    if (token !== undefined && /^\d{1,3}$/.test(token)) return { value: Number(token), end: k + 1 };
    const parsed = parseWords(tokens, k);
    return parsed && parsed.value < 1000 ? parsed : null;
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    const digits = parseDigits(token);

    if (digits) {
      const start = i;
      let { value } = digits;
      const { alt } = digits;
      i += 1;
      // "45 300 km" (milhar separado pelo reconhecimento de fala): só com "km" junto.
      const kmAround = KM_UNITS.has(tokens[i + 1] ?? '') || KM_WORDS.has(tokens[start - 1] ?? '');
      if (
        kmAround &&
        /^\d{1,3}$/.test(token) &&
        /^\d{3}$/.test(tokens[i] ?? '') &&
        alt === undefined
      ) {
        const joined = Number(token + tokens[i]!);
        value = joined;
        i += 1;
      }
      if (tokens[i] === 'mil' && Number.isInteger(value)) {
        value *= 1000;
        i += 1;
        const lower = lowerPart(i);
        if (lower) {
          value += lower.value;
          i = lower.end;
        }
      } else if (tokens[i] === 'virgula' || tokens[i] === 'ponto') {
        const fraction = parseSpokenFraction(tokens, i + 1);
        if (fraction && Number.isInteger(value)) {
          value = Number(`${value}.${fraction.digits}`);
          i = fraction.end;
        }
      }
      push(value, alt);
      continue;
    }

    if (isNumberWord(token)) {
      const parsed = parseWords(tokens, i);
      // "um" e "uma" sozinhos são artigo ("um tanque cheio"), não o número 1.
      if (!parsed || (parsed.value === 1 && parsed.end - i === 1 && token in UNITS)) {
        items.push({ kind: 'word', w: token });
        i += 1;
        continue;
      }
      let value = parsed.value;
      let end = parsed.end;

      if (tokens[end] === 'virgula' || tokens[end] === 'ponto') {
        const fraction = parseSpokenFraction(tokens, end + 1);
        if (fraction) {
          value = Number(`${value}.${fraction.digits}`);
          end = fraction.end;
        }
      } else if (tokens[end] === 'e' && value < 100 && isNumberWord(tokens[end + 1])) {
        // "seis e vinte e nove": a ordem quebrou (unidade e depois dezena), então são os centavos.
        const fraction = parseWords(tokens, end + 1);
        if (fraction && fraction.value < 100) {
          value = Number(`${value}.${String(fraction.value)}`);
          end = fraction.end;
        }
      }
      push(value);
      i = end;
      continue;
    }

    items.push({ kind: 'word', w: token });
    i += 1;
  }

  return mergeReais(items);
}

const PRICE_ARTICLES = new Set(['o', 'no', 'por', 'cada', 'pelo', 'p']);

/** `true` se, a partir de `k`, vem "o litro", "por litro", "no litro"... */
function isPerLiter(items: Item[], k: number): boolean {
  const a = items[k];
  const b = items[k + 1];
  return a?.kind === 'word' && PRICE_ARTICLES.has(a.w) && b?.kind === 'word' && b.w === 'litro';
}

/**
 * "6 reais e 29 centavos", "6 reais e 29 o litro" e "6 e 29 o litro" viram um número só (6,29).
 * "150 reais e 25 litros" não: aí são dois números.
 */
function mergeReais(items: Item[]): Item[] {
  const out: Item[] = [];
  for (let k = 0; k < items.length; k++) {
    const a = items[k]!;
    if (a.kind !== 'num') {
      out.push(a);
      continue;
    }
    const mid = items[k + 1];
    const hasReais = mid?.kind === 'word' && REAIS.has(mid.w);
    const andAt = hasReais ? k + 2 : k + 1;
    const and = items[andAt];
    const cents = items[andAt + 1];
    if (
      and?.kind === 'word' &&
      and.w === 'e' &&
      cents?.kind === 'num' &&
      Number.isInteger(a.value) &&
      Number.isInteger(cents.value) &&
      cents.value < 100 &&
      a.value < 1000
    ) {
      const next = items[andAt + 2];
      const isCents = next?.kind === 'word' && (next.w === 'centavos' || next.w === 'centavo');
      if (isCents || isPerLiter(items, andAt + 2)) {
        const value = Number(`${a.value}.${String(cents.value).padStart(2, '0')}`);
        out.push({ kind: 'num', id: a.id, value });
        // "reais" fica depois do número: é ele que diz que é dinheiro.
        if (hasReais) out.push({ kind: 'word', w: 'reais' });
        if (isCents) k = andAt + 2;
        else {
          // Mantém "o litro" depois do número para a regra do preço reconhecê-lo.
          k = andAt + 1;
        }
        continue;
      }
    }
    out.push(a);
  }
  // Os ids passam a ser a posição na lista final: é o que `answers` usa.
  return out.map((item, index) => (item.kind === 'num' ? { ...item, id: index } : item));
}

/* ------------------------------------------------------------------ o que cada palavra indica */

const REAIS = new Set(['reais', 'real', 'rea', 'rais', 'conto', 'contos', 'pila', 'pilas']);
const KM_UNITS = new Set([
  'km',
  'kms',
  'quilometro',
  'quilometros',
  'kilometro',
  'kilometros',
  'quilometragem',
]);
const LITERS_UNITS = new Set(['litros', 'l', 'lt', 'lts', 'litro', 'litrus']);
const NOISE_AFTER = new Set(['horas', 'hora', 'h', 'minutos', 'dias', 'dia', 'anos']);

/** Palavras que antes de um número dizem que é o km. */
const KM_WORDS = new Set([
  'km',
  'kms',
  'quilometragem',
  'quilometros',
  'quilometro',
  'kilometros',
  'hodometro',
  'odometro',
  'painel',
  'marcando',
  'marcava',
  'marca',
]);
/** Palavras que antes de um número dizem que é o valor pago. */
const TOTAL_WORDS = new Set([
  'paguei',
  'pago',
  'pagou',
  'pagar',
  'gastei',
  'gasto',
  'gastou',
  'valor',
  'total',
  'deu',
  'foram',
  'custou',
  'saiu',
  'ficou',
  'rs',
]);
const FILLERS = new Set([
  'a',
  'o',
  'os',
  'as',
  'de',
  'do',
  'da',
  'no',
  'na',
  'em',
  'por',
  'foi',
  'era',
  'esta',
  'ta',
  'estava',
  'um',
  'uma',
  'e',
  'que',
  'com',
  'pelo',
]);
/** Entre "litro" e o número, estas palavras ainda deixam o número ser o preço. */
const PRICE_BRIDGE = new Set([
  'a',
  'de',
  'por',
  'custou',
  'saiu',
  'ficou',
  'estava',
  'esta',
  'ta',
  'era',
  'foi',
  'pagando',
  'cobrando',
  'cobrou',
  'em',
  'no',
  'na',
  'o',
  'do',
  'da',
  'preco',
]);

function wordAt(items: Item[], k: number): string | undefined {
  const item = items[k];
  return item?.kind === 'word' ? item.w : undefined;
}

type Explicit = FuelSpeechField | 'noise' | null;

/** Campo que as palavras em volta do número indicam, ou `null` se nenhuma indica. */
function explicitField(items: Item[], k: number): Explicit {
  const next = wordAt(items, k + 1);

  if (next !== undefined && NOISE_AFTER.has(next)) return 'noise';
  if (wordAt(items, k - 1) === 'dia') return 'noise';

  // Depois do número. "180 reais, o litro a 4,50" não faz de 180 o preço: fora de R$ 2 a R$ 12.
  const self = items[k] as NumberItem;
  const plausiblePrice =
    priceRatioOk(self.value) || (self.alt !== undefined && priceRatioOk(self.alt));
  if (plausiblePrice && isPerLiter(items, k + 1)) return 'pricePerLiter';
  if (next !== undefined && REAIS.has(next)) {
    return plausiblePrice && isPerLiter(items, k + 2) ? 'pricePerLiter' : 'total';
  }
  // "6,29, km 45300": sem a vírgula, o 6,29 ficaria colado no "km"; km é sempre inteiro.
  if (next !== undefined && KM_UNITS.has(next) && Number.isInteger(self.value)) return 'km';
  if (next !== undefined && LITERS_UNITS.has(next)) return 'liters';

  // Antes do número, até 5 palavras, sem passar por outro número.
  const before: string[] = [];
  let stoppedAtNumber = false;
  for (let back = k - 1; back >= 0 && before.length < 5; back--) {
    const item = items[back]!;
    if (item.kind === 'num') {
      stoppedAtNumber = true;
      break;
    }
    before.push(item.w);
  }

  // "o litro a 6,29", "litro custou 6,29", "25 litros a 6,29".
  for (let n = 0; n < before.length; n++) {
    const w = before[n]!;
    if (w === 'litro' || w === 'litros') {
      // "6,29 o litro 50": esse "litro" é do 6,29, não do 50.
      const owned =
        PRICE_ARTICLES.has(before[n + 1] ?? '') && stoppedAtNumber && n + 2 === before.length;
      if (owned) break;
      const between = before.slice(0, n);
      const bridged = between.every((word) => PRICE_BRIDGE.has(word));
      // "25 litros 150" não tem ponte: o 150 não é o preço. "25 litros a 6,29" tem.
      if (bridged && (w === 'litro' || between.includes('a'))) return 'pricePerLiter';
      break;
    }
    if (!FILLERS.has(w) && !PRICE_BRIDGE.has(w) && !TOTAL_WORDS.has(w)) break;
  }

  for (const w of before) {
    if (FILLERS.has(w)) continue;
    if (w === 'preco') return 'pricePerLiter';
    if (KM_WORDS.has(w)) return 'km';
    if (TOTAL_WORDS.has(w)) return 'total';
    break;
  }
  return null;
}

/* ------------------------------------------------------------------ combustível e tanque cheio */

function detectFuelType(tokens: string[]): FuelSpeechFuelType | undefined {
  let found: FuelSpeechFuelType | undefined;
  tokens.forEach((w, i) => {
    if (/^(gasolina|gazolina|gasolinha)s?$/.test(w)) found = 'gasoline';
    else if (/^(etanol|etanou|etanal|alcool|alcol)$/.test(w)) found = 'ethanol';
    else if (/^(diesel|disel|dizel)$/.test(w)) found = 'diesel';
    else if (w === 'gnv' || (w === 'gas' && tokens[i + 1] === 'natural')) found = 'gnv';
    else if (w === 'g' && tokens[i + 1] === 'n' && tokens[i + 2] === 'v') found = 'gnv';
  });
  return found;
}

const FULL_WORDS = new Set([
  'encheu',
  'enchi',
  'enchemos',
  'encheram',
  'enxeu',
  'completei',
  'completou',
  'completamos',
  'completo',
  'completa',
  'cheio',
  'cheia',
]);
const NEGATIONS = new Set(['nao', 'nem', 'sem', 'nunca', 'nada']);

/** "encheu", "completei", "tanque cheio" = `true`; "não enchi", "parcial", "sem encher" = `false`. */
function detectFullTank(tokens: string[]): boolean | undefined {
  let result: boolean | undefined;
  tokens.forEach((w, i) => {
    const isFull = FULL_WORDS.has(w);
    if (!isFull && w !== 'parcial' && w !== 'encher') return;
    const negated = tokens.slice(Math.max(0, i - 3), i).some((before) => NEGATIONS.has(before));
    if (w === 'parcial') result = negated;
    else if (w === 'encher') {
      if (negated) result = false;
    } else result = !negated;
  });
  return result;
}

/* ------------------------------------------------------------------ números sem palavra */

const priceRatioOk = (price: number): boolean => price >= FUEL_PRICE_MIN && price <= FUEL_PRICE_MAX;

const amountsAgree = (price: number, liters: number, total: number): boolean =>
  Math.abs(price * liters - total) / total <= FUEL_AMOUNT_TOLERANCE;

function formatNumber(value: number): string {
  return String(value).replace('.', ',');
}

function questionFor(id: number, number: number, options: FuelSpeechField[]): FuelSpeechQuestion {
  const labels = options.map((field) => FIELD_LABELS[field]);
  return { id, number, options, text: `${formatNumber(number)} é ${labels.join(' ou ')}?` };
}

/**
 * Interpreta a frase. `answers` traz as respostas às perguntas já feitas (o `id` do número vira o
 * campo escolhido) e a chamada seguinte já considera cada uma.
 */
export function parseFuelSpeech(
  text: string,
  context: FuelSpeechContext = {},
  answers: FuelSpeechAnswers = {},
): FuelSpeechResult {
  const tokens = tokenize(text);
  const items = buildItems(tokens);
  const lastKm = context.lastKm ?? null;

  const assigned: { field: FuelSpeechField; value: number; order: number }[] = [];
  const loose: NumberItem[] = [];

  items.forEach((item, k) => {
    if (item.kind !== 'num') return;
    const forced = answers[item.id];
    const explicit = (forced ?? explicitField(items, k)) as Explicit;
    if (explicit === 'noise') return;

    if (explicit !== null) {
      const useAlt =
        explicit === 'pricePerLiter' &&
        item.alt !== undefined &&
        priceRatioOk(item.alt) &&
        !priceRatioOk(item.value);
      assigned.push({ field: explicit, value: useAlt ? item.alt! : item.value, order: k });
      return;
    }

    // Sem palavra: o tamanho do número diz o que ele é.
    const integer = Number.isInteger(item.value);
    const nearLastKm =
      lastKm !== null &&
      lastKm >= 100 &&
      integer &&
      item.value >= lastKm &&
      item.value <= lastKm + FUEL_MAX_KM_JUMP;
    if (item.alt !== undefined && priceRatioOk(item.alt) && !nearLastKm) {
      assigned.push({ field: 'pricePerLiter', value: item.alt, order: k });
    } else if (integer && (item.value >= 1000 || nearLastKm)) {
      assigned.push({ field: 'km', value: item.value, order: k });
    } else if (!integer && priceRatioOk(item.value)) {
      assigned.push({ field: 'pricePerLiter', value: item.value, order: k });
    } else {
      loose.push(item);
    }
  });

  const fields: FuelSpeechFields = {};
  const order: FuelAmountField[] = [];
  // Quando a pessoa repete um campo (se corrigindo), vale o último.
  for (const { field, value } of [...assigned].sort((a, b) => a.order - b.order)) {
    fields[field] = value;
    if (field !== 'km') {
      const at = order.indexOf(field);
      if (at >= 0) order.splice(at, 1);
      order.push(field);
    }
  }

  let question: FuelSpeechQuestion | null = null;
  const give = (item: NumberItem, field: 'total' | 'liters') => {
    fields[field] = item.value;
    order.push(field);
  };

  // Valor e litros sem palavra.
  const pending = [...loose];
  const open = (): ('total' | 'liters')[] =>
    (['total', 'liters'] as const).filter((field) => fields[field] === undefined);

  if (pending.length >= 2 && open().length === 2) {
    const [a, b] = pending as [NumberItem, NumberItem];
    const price = fields.pricePerLiter;
    const aTotal = a.value / b.value;
    const bTotal = b.value / a.value;
    let aIsTotal: boolean | null = null;
    if (price !== undefined) {
      const first = amountsAgree(price, b.value, a.value);
      const second = amountsAgree(price, a.value, b.value);
      if (first !== second) aIsTotal = first;
    }
    if (aIsTotal === null) {
      const first = priceRatioOk(aTotal);
      const second = priceRatioOk(bTotal);
      if (first !== second) aIsTotal = first;
    }
    if (aIsTotal !== null) {
      give(aIsTotal ? a : b, 'total');
      give(aIsTotal ? b : a, 'liters');
      pending.splice(0, 2);
    }
  }

  if (pending.length > 0) {
    const [item] = pending as [NumberItem];
    const missing = open();
    if (missing.length === 1) {
      // Só um campo em aberto: o número é dele (se não fecha, a validação avisa depois).
      give(item, missing[0]!);
      pending.shift();
    }
    if (pending.length > 0 && open().length > 0) {
      question = questionFor(pending[0]!.id, pending[0]!.value, open());
    }
  }

  // Dois dos três (valor, litros, preço) preenchem o terceiro.
  let calculated: FuelAmountField | null = null;
  const present = order.filter((field) => fields[field] !== undefined);
  if (present.length === 2 && question === null) {
    const missing = calculateMissingFuelAmount(
      { total: fields.total, liters: fields.liters, pricePerLiter: fields.pricePerLiter },
      present,
    );
    if (missing) {
      fields[missing.field] = missing.value;
      calculated = missing.field;
    }
  }

  const spokenFuel = detectFuelType(tokens);
  const fullTank = detectFullTank(tokens);
  if (spokenFuel !== undefined) fields.fuelType = spokenFuel;
  else if (context.lastFuelType) fields.fuelType = context.lastFuelType;
  if (fullTank !== undefined) fields.fullTank = fullTank;

  return {
    fields,
    calculated,
    fuelTypeFromContext: spokenFuel === undefined && !!context.lastFuelType,
    question,
  };
}
