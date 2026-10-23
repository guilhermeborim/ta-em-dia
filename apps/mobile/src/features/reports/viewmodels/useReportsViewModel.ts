import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { useFlag } from '../../../core/flags/useFlag';
import {
  availablePeriods,
  buildReport,
  hasReportData,
  type ReportData,
  type ReportPeriod,
} from '../models/reports';
import { loadReportData } from '../models/reports.repository';

/** ViewModel de Relatórios (tela 14): período, totais, gráfico de gasto e consumo. Lê só o SQLite local. */
export function useReportsViewModel() {
  const db = useDb();
  const router = useRouter();
  const advanced = useFlag('reports.advanced');
  const [data, setData] = useState<ReportData | null>(null);
  const [selected, setSelected] = useState<ReportPeriod>('month');

  // Recarrega ao voltar para a aba (ex.: depois de registrar um abastecimento).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadReportData(db).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const periods = availablePeriods(advanced);
  // Se o período escolhido não está liberado no plano, vale o primeiro liberado.
  const period = periods.some((option) => option.value === selected) ? selected : periods[0].value;
  const report = useMemo(() => (data ? buildReport(data, period) : null), [data, period]);

  return {
    loading: data === null,
    hasVehicle: data?.vehicle != null,
    hasData: data !== null && hasReportData(data),
    periods,
    period,
    /** Com um período só (plano sem relatórios avançados), o seletor não aparece. */
    showPeriods: periods.length > 1,
    report,
    selectPeriod: setSelected,
    addVehicle: () => router.push('/primeiro-veiculo'),
    openFuel: () => router.push('/novo-abastecimento'),
  };
}
