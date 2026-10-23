import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { useFlag } from '../../../core/flags/useFlag';
import { buildVehicleDetail, type VehicleDetailData } from '../models/vehicleDetail';
import { loadVehicleDetail } from '../models/vehicleDetail.repository';

/** ViewModel do detalhe do veículo (tela 17): números, dados e atalho para atualizar o km. */
export function useVehicleDetailViewModel() {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Sem a flag, o cartão "Valor na FIPE" é só um aviso de "Em breve" (Fase 2).
  const fipeAvailable = useFlag('fipe.value');
  // `undefined` = carregando; `null` = não existe (ou foi excluído).
  const [data, setData] = useState<VehicleDetailData | null | undefined>(undefined);

  // Recarrega ao voltar (ex.: depois de atualizar o km).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadVehicleDetail(db, id).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const view = useMemo(() => (data ? buildVehicleDetail(data) : null), [data]);

  return {
    loading: data === undefined,
    notFound: data === null,
    view,
    showFipeTeaser: !fipeAvailable,
    back: () => router.back(),
    edit: () => router.push({ pathname: '/veiculo/[id]/editar', params: { id } }),
    updateKm: () => router.push({ pathname: '/veiculo/[id]/atualizar-km', params: { id } }),
  };
}
