import {
  DOCUMENT_KINDS,
  DOCUMENT_LABELS,
  isVehicleDocument,
  parseDueDate,
  type DocumentKind,
  type DocumentRecord,
} from '@ta-em-dia/shared';
import { statusOfDocument } from '../../../core/documents';
import { toDateInput } from '../../../core/format';
import type { IconName, StatusTone } from '../../../ui';

export interface DocumentsData {
  /** Veículo ativo (dono dos prazos do carro). `null` se não há veículo. */
  vehicle: { id: string; name: string; plate?: string } | null;
  documents: DocumentRecord[];
}

export interface DocumentItemView {
  id: string;
  title: string;
  /** Ex.: "Vence em 20/11/2026". */
  subtitle: string;
  icon: IconName;
  tone: StatusTone;
  /** Ex.: "Em dia", "23 dias", "Vencido". */
  status: string;
}

export interface DocumentSection {
  key: 'vehicle' | 'person';
  /** Ex.: "GOLZINHO · BRA2E19" ou "VOCÊ". */
  title: string;
  items: DocumentItemView[];
}

const icons: Record<DocumentKind, IconName> = {
  ipva: 'file',
  licensing: 'shield',
  insurance: 'shield',
  cnh: 'id',
};

const tones = { ok: 'ok', soon: 'warning', overdue: 'danger' } as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto do selo: "Vencido", "Hoje", "23 dias" ou "Em dia". */
function statusLabel(tone: 'ok' | 'soon' | 'overdue', daysLeft: number): string {
  if (tone === 'overdue') return 'Vencido';
  if (tone === 'ok') return 'Em dia';
  return daysLeft === 0 ? 'Hoje' : plural(daysLeft, 'dia', 'dias');
}

/** "Vence em 20/11/2026", "Venceu em 15/10/2026" (seguro: "Renova em"). */
function subtitle(kind: DocumentKind, dueDate: string, overdue: boolean): string {
  const date = toDateInput(parseDueDate(dueDate)!);
  if (overdue) return `Venceu em ${date}`;
  return `${kind === 'insurance' ? 'Renova' : 'Vence'} em ${date}`;
}

export function toDocumentItem(
  document: DocumentRecord,
  today: Date = new Date(),
): DocumentItemView {
  const status = statusOfDocument(document, today);
  return {
    id: document.id,
    title: DOCUMENT_LABELS[document.kind],
    subtitle: subtitle(document.kind, document.dueDate, status.tone === 'overdue'),
    icon: icons[document.kind],
    tone: tones[status.tone],
    status: statusLabel(status.tone, status.daysLeft),
  };
}

/**
 * Tela 18: os prazos do veículo ativo e, separada, a CNH ("Você"). Dentro de cada grupo, na
 * ordem fixa IPVA, licenciamento, seguro. Grupo sem prazo não aparece.
 */
export function buildDocumentSections(
  data: DocumentsData,
  today: Date = new Date(),
): DocumentSection[] {
  const order = (document: DocumentRecord) => DOCUMENT_KINDS.indexOf(document.kind);
  const sorted = [...data.documents].sort((a, b) => order(a) - order(b));
  const sections: DocumentSection[] = [];

  const ofVehicle = sorted.filter((d) => isVehicleDocument(d.kind));
  if (data.vehicle && ofVehicle.length > 0) {
    const { name, plate } = data.vehicle;
    sections.push({
      key: 'vehicle',
      title: [name.toUpperCase(), plate?.toUpperCase()].filter(Boolean).join(' · '),
      items: ofVehicle.map((d) => toDocumentItem(d, today)),
    });
  }

  const ofPerson = sorted.filter((d) => !isVehicleDocument(d.kind));
  if (ofPerson.length > 0) {
    sections.push({
      key: 'person',
      title: 'VOCÊ',
      items: ofPerson.map((d) => toDocumentItem(d, today)),
    });
  }
  return sections;
}

/** Tipos que ainda podem ser cadastrados: um por veículo, a CNH uma só; sem veículo, só a CNH. */
export function availableKinds(data: DocumentsData): DocumentKind[] {
  const used = new Set(data.documents.map((d) => d.kind));
  return DOCUMENT_KINDS.filter(
    (kind) => !used.has(kind) && (data.vehicle !== null || !isVehicleDocument(kind)),
  );
}

/**
 * Texto do aviso no pé da tela: "Avisamos 30 e 7 dias antes de cada vencimento." quando todos
 * os prazos usam os mesmos dias; senão, um texto geral. Sem prazos, sem texto.
 */
export function noticeText(documents: DocumentRecord[]): string | null {
  if (documents.length === 0) return null;
  const sets = new Set(documents.map((d) => [...d.notifyDays].sort((a, b) => b - a).join(',')));
  if (sets.size > 1) return 'Avisamos antes de cada vencimento, nos dias de cada prazo.';

  const [only] = [...sets];
  if (!only) return 'Os prazos estão sem aviso. Toque num deles para escolher.';
  const days = only.split(',').map(Number);
  if (days.length === 1) {
    return `Avisamos ${days[0]} ${days[0] === 1 ? 'dia' : 'dias'} antes de cada vencimento.`;
  }
  return `Avisamos ${days.slice(0, -1).join(', ')} e ${days.at(-1)} dias antes de cada vencimento.`;
}
