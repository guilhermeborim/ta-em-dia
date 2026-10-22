import type { DocumentCounts } from '../../../core/documents';

/** Valor de "Documentos e prazos" na aba Mais: "1 vencido" (vermelho) ou "2 perto de vencer" (âmbar). */
export function documentsBadge(
  counts: DocumentCounts,
): { text: string; tone: 'danger' | 'warning' } | null {
  if (counts.overdue > 0) {
    return {
      text: `${counts.overdue} ${counts.overdue === 1 ? 'vencido' : 'vencidos'}`,
      tone: 'danger',
    };
  }
  if (counts.soon > 0) return { text: `${counts.soon} perto de vencer`, tone: 'warning' };
  return null;
}
