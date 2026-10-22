import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useDb } from '../../../core/db';
import { availableKinds, buildDocumentSections, type DocumentsData } from '../models/documentsList';
import { loadDocuments } from '../models/documents.repository';

/** ViewModel de Documentos e prazos (tela 18): prazos do veículo ativo e a CNH. Lê só o SQLite local. */
export function useDocumentsViewModel() {
  const db = useDb();
  const router = useRouter();
  const [data, setData] = useState<DocumentsData | null>(null);

  // Recarrega ao voltar (ex.: depois de adicionar ou editar um prazo).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDocuments(db).then((value) => {
        if (active) setData(value);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const sections = useMemo(() => (data ? buildDocumentSections(data) : []), [data]);

  return {
    loading: data === null,
    sections,
    isEmpty: data !== null && data.documents.length === 0,
    /** Sem tipo para cadastrar (todos já têm prazo), o botão some. */
    canAdd: data !== null && availableKinds(data).length > 0,
    back: () => router.back(),
    add: () => router.push('/documento/novo'),
    open: (id: string) => router.push({ pathname: '/documento/[id]', params: { id } }),
  };
}
