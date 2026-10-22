import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDb } from '../../../core/db';
import { appEnv } from '../../../core/env/appEnv';
import { useToast } from '../../../core/toast/useToast';
import { documentsBadge } from '../models/documentsBadge';
import { loadMoreSummary } from '../models/more.repository';

/** ViewModel da aba Mais (tela 15): conta, atalhos com números e, fora de produção, os de desenvolvimento. */
export function useMoreViewModel() {
  const db = useDb();
  const router = useRouter();
  const isDev = appEnv !== 'production';
  const { toast, show } = useToast();
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [documents, setDocuments] = useState<ReturnType<typeof documentsBadge>>(null);

  // Recarrega ao voltar para a aba (ex.: depois de adicionar um veículo ou mudar um prazo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadMoreSummary(db).then((summary) => {
        if (!active) return;
        setVehicleCount(summary.vehicleCount);
        setDocuments(documentsBadge(summary.documents));
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  // Conta e ajuda ainda não existem: avisam, como o "Salve seus dados" do Início.
  const comingSoon = useCallback(() => show({ title: 'Em breve' }), [show]);

  return {
    showDevTools: isDev,
    toast,
    /** Sem login: os dados ficam só no aparelho. */
    account: { name: 'Sem login', sync: 'local' as const },
    /** Número de veículos ao lado de Meus veículos; some enquanto carrega ou sem veículos. */
    vehicleCount: vehicleCount ? String(vehicleCount) : undefined,
    /** "1 vencido" ao lado de Documentos e prazos; `null` quando está tudo em dia. */
    documentsBadge: documents,
    openAccount: comingSoon,
    openSettings: () => router.push('/configuracoes'),
    openHelp: comingSoon,
    openVehicles: () => router.push('/veiculos'),
    openDocuments: () => router.push('/documentos'),
    openHistory: () => router.push('/historico'),
    openPremium: () => router.push('/premium'),
    openFuel: () => router.push('/novo-abastecimento'),
    openStatus: () => router.push('/status'),
    openComponents: () => router.push('/componentes'),
  };
}
