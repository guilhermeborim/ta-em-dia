import { useMemo } from 'react';
import { useFlag } from '../../../core/flags/useFlag';
import { buildMonthSummary } from '../models/dashboard.service';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** ViewModel: estado e texto pronto para a tela. A View não conhece regras. */
export function useDashboardViewModel() {
  // TODO: trocar os valores fixos pela leitura do SQLite (fuel.repository).
  const summary = useMemo(() => buildMonthSummary(0, 0), []);
  const showReports = useFlag('reports.advanced');

  return {
    title: 'Este mês',
    spentLabel: brl.format(summary.spent),
    projectionLabel: `Projeção: ${brl.format(summary.projection)}`,
    comparisonLabel:
      summary.vsPreviousPct === null
        ? 'Sem dados do mês anterior'
        : `${summary.vsPreviousPct.toFixed(0)}% vs mês anterior`,
    showReports,
  };
}
