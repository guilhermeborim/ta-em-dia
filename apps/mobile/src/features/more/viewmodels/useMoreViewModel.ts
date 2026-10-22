import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDb } from '../../../core/db';
import { appEnv } from '../../../core/env/appEnv';
import { documentsBadge } from '../models/documentsBadge';
import { loadDocumentCounts } from '../models/documents.repository';

/** ViewModel da aba Mais: Meus veículos, Documentos, Histórico e, fora de produção, os atalhos de desenvolvimento. */
export function useMoreViewModel() {
  const db = useDb();
  const router = useRouter();
  const isDev = appEnv !== 'production';
  const [documents, setDocuments] = useState<ReturnType<typeof documentsBadge>>(null);

  // Recarrega ao voltar para a aba (ex.: depois de mudar um prazo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDocumentCounts(db).then((counts) => {
        if (active) setDocuments(documentsBadge(counts));
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return {
    showDevTools: isDev,
    /** "1 vencido" ao lado de Documentos e prazos; `null` quando está tudo em dia. */
    documentsBadge: documents,
    openVehicles: () => router.push('/veiculos'),
    openDocuments: () => router.push('/documentos'),
    openHistory: () => router.push('/historico'),
    openStatus: () => router.push('/status'),
    openComponents: () => router.push('/componentes'),
  };
}
