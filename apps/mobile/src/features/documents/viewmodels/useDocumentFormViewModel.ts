import { DOCUMENT_LABELS } from '@ta-em-dia/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useDb } from '../../../core/db';
import { dateFromInput, toDateInput } from '../../../core/format';
import { refreshReminders } from '../../../core/reminders';
import { loadSettings } from '../../../core/settings';
import { addDocument, deleteDocument, findDocument, updateDocument } from '../../../core/documents';
import {
  buildDocumentInput,
  dueInputFrom,
  emptyDocumentForm,
  formatDateInput,
  kindOptions,
  notifyOptions,
  toggleNotifyDay,
  type DocumentErrors,
  type DocumentForm,
} from '../models/documentForm';
import { availableKinds, type DocumentsData } from '../models/documentsList';
import { loadDocuments } from '../models/documents.repository';

/**
 * ViewModel do formulário de prazo. Em `add`, a pessoa escolhe entre os tipos ainda não
 * cadastrados; em `edit` (`id` na rota), o tipo é fixo e dá para excluir.
 */
export function useDocumentFormViewModel(mode: 'add' | 'edit') {
  const db = useDb();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<DocumentsData | null>(null);
  const [title, setTitle] = useState('');
  // `undefined` = carregando; `null` = não existe (ou foi excluído).
  const [found, setFound] = useState<boolean | undefined>(mode === 'edit' ? undefined : true);
  const [form, setForm] = useState<DocumentForm>(emptyDocumentForm);
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (mode === 'edit') {
        const document = id ? await findDocument(db, id) : null;
        if (!active) return;
        setFound(document !== null);
        if (document) {
          setTitle(DOCUMENT_LABELS[document.kind]);
          setForm({
            kind: document.kind,
            dueDate: dueInputFrom(document.dueDate),
            notifyDays: [...document.notifyDays].sort((a, b) => b - a),
          });
        }
        return;
      }
      const [loaded, settings] = await Promise.all([loadDocuments(db), loadSettings(db)]);
      if (!active) return;
      setData(loaded);
      // Prazo novo já vem com a antecedência padrão de Configurações.
      setForm((prev) => ({
        ...prev,
        kind: availableKinds(loaded)[0] ?? null,
        notifyDays: settings.documentNotifyDays,
      }));
    })();
    return () => {
      active = false;
    };
  }, [db, id, mode]);

  const close = useCallback(() => router.back(), [router]);

  const save = useCallback(async () => {
    if (busy) return;
    const result = buildDocumentInput(form);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'edit' && id) {
        await updateDocument(db, id, result.value);
      } else {
        await addDocument(db, { ...result.value, vehicleId: data?.vehicle?.id });
      }
      // O prazo mudou: os avisos dele também.
      void refreshReminders(db);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, data, db, form, id, mode, router]);

  const remove = useCallback(async () => {
    if (busy || !id) return;
    setBusy(true);
    try {
      await deleteDocument(db, id);
      void refreshReminders(db);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [busy, db, id, router]);

  const confirmDelete = useCallback(() => {
    Alert.alert('Excluir prazo?', `O prazo de ${title} deixa de aparecer na lista.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void remove() },
    ]);
  }, [remove, title]);

  const kinds = data ? kindOptions(availableKinds(data)) : [];

  return {
    loading: found === undefined || (mode === 'add' && data === null),
    notFound: found === false,
    isEdit: mode === 'edit',
    title: mode === 'edit' ? title : 'Adicionar prazo',
    /** Tipos para escolher (só em `add`). Vazio quando todos já foram cadastrados. */
    kinds,
    form,
    errors,
    busy,
    selectKind: (kind: NonNullable<DocumentForm['kind']>) => {
      setForm((prev) => ({ ...prev, kind }));
      setErrors((prev) => ({ ...prev, kind: undefined }));
    },
    notifyOptions: notifyOptions.map((option) => ({
      ...option,
      selected: form.notifyDays.includes(option.days),
    })),
    toggleNotify: (days: number) =>
      setForm((prev) => ({ ...prev, notifyDays: toggleNotifyDay(prev.notifyDays, days) })),
    setDueDate: (value: string) => {
      setForm((prev) => ({ ...prev, dueDate: formatDateInput(value) }));
      setErrors((prev) => ({ ...prev, dueDate: undefined }));
    },
    pickerOpen,
    /** Calendário abre no dia já digitado, ou em hoje. */
    pickerValue: dateFromInput(form.dueDate) ?? new Date(),
    // Prazo pode ser passado (já vencido) ou daqui a anos; o mesmo limite do campo digitado.
    pickerMin: new Date(2000, 0, 1),
    pickerMax: new Date(2100, 11, 31),
    openDatePicker: () => setPickerOpen(true),
    closeDatePicker: () => setPickerOpen(false),
    pickDueDate: (date: Date) => {
      setForm((prev) => ({ ...prev, dueDate: toDateInput(date) }));
      setErrors((prev) => ({ ...prev, dueDate: undefined }));
    },
    save,
    confirmDelete,
    close,
  };
}
