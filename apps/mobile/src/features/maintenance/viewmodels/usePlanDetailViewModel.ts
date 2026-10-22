import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { buildPlanDetail } from '../models/planDetail';
import { loadPlanDetail, setPlanEnabled, type PlanDetailData } from '../models/plans.repository';

/** ViewModel do item do plano (telas 11 e 11b): previsão, dados, editar intervalo e desativar. */
export function usePlanDetailViewModel() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // `undefined` = carregando; `null` = não existe (ou foi excluído).
  const [data, setData] = useState<PlanDetailData | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Recarrega ao voltar (ex.: depois de editar o intervalo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadPlanDetail(db, id).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const view = useMemo(() => (data ? buildPlanDetail(data) : null), [data]);

  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setPlanEnabled(db, id, false);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, db, id, router]);

  return {
    loading: data === undefined,
    notFound: data === null,
    view,
    busy,
    back: () => router.back(),
    edit: () => router.push({ pathname: '/plano-manutencao/[id]/editar', params: { id } }),
    disable,
  };
}
