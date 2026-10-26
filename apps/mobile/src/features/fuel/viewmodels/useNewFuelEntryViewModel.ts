import {
  isFuelDraftComplete,
  suggestStations,
  type FuelAmountField,
  type FuelDraft,
} from '@ta-em-dia/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatKm } from '../../../core/format';
import { useDb } from '../../../core/db';
import { loadFuelFormContext, type FuelFormContext } from '../models/fuelContext';
import {
  addFuelDraft,
  addFuelEntry,
  getFuelRecord,
  listStationNames,
  updateFuelRecord,
} from '../../../core/fuel';
import { useFlag } from '../../../core/flags/useFlag';
import { refreshReminders } from '../../../core/reminders';
import {
  buildFuelDraftInput,
  buildFuelEntryInput,
  deriveAmounts,
  emptyFuelForm,
  entryDateFor,
  formatEntryDate,
  fuelFormFromDraft,
  fuelTypeOptions,
  sanitizeAmount,
  touchAmount,
  type FuelForm,
  type FuelFormErrors,
  type FuelType,
} from '../models/fuelForm';
import { useFuelVoice } from './useFuelVoice';

/**
 * ViewModel do Novo abastecimento: sugestões, cálculo do terceiro valor, validação e gravação local.
 * Aberto com `id` na rota, é o "Completar abastecimento": carrega o rascunho e, ao salvar, ele vira
 * um abastecimento completo (mesmo id). O botão "Falar" (só no Novo) preenche e salva pela voz.
 */
export function useNewFuelEntryViewModel() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const draftId = typeof params.id === 'string' ? params.id : undefined;
  const [draft, setDraft] = useState<FuelDraft | null>(null);
  const [stations, setStations] = useState<string[]>([]);
  const [context, setContext] = useState<FuelFormContext | null>(null);
  const [form, setForm] = useState<FuelForm>(emptyFuelForm);
  const [kmTouched, setKmTouched] = useState(false);
  const [errors, setErrors] = useState<FuelFormErrors>({});
  const [busy, setBusy] = useState(false);
  // `null` = hoje (a data de agora, na hora de salvar); a pessoa troca pelo calendário.
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Registro que a voz salvou e a pessoa pediu para editar: salvar atualiza esse mesmo id.
  const [savedId, setSavedId] = useState<string | null>(null);
  const voiceEnabled = useFlag('fuel.voice');

  useEffect(() => {
    let active = true;
    loadFuelFormContext(db).then(async (value) => {
      if (!active) return;
      if (draftId) {
        const record = await getFuelRecord(db, draftId);
        if (!active) return;
        // Só o rascunho se completa por aqui; abastecimento completo ainda não tem edição.
        if (!record || !('status' in record)) {
          router.back();
          return;
        }
        setDraft(record);
        setKmTouched(record.km !== undefined);
        setForm(
          fuelFormFromDraft(record, {
            fuelType: value.lastFuelType,
            suggestedKm: value.suggestedKm,
          }),
        );
        setContext(value);
        return;
      }
      setContext(value);
      setForm((prev) => ({
        ...prev,
        fuelType: value.lastFuelType ?? prev.fuelType,
        km: value.suggestedKm === null ? '' : formatKm(String(value.suggestedKm)),
      }));
    });
    listStationNames(db).then((names) => {
      if (active) setStations(names);
    });
    return () => {
      active = false;
    };
  }, [db, draftId, router]);

  const amounts = useMemo(() => deriveAmounts(form), [form]);
  const stationSuggestions = useMemo(
    () => suggestStations(stations, form.station),
    [stations, form.station],
  );

  const setAmount = useCallback((field: FuelAmountField, text: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: sanitizeAmount(field, text),
      amountOrder: touchAmount(prev.amountOrder, field),
    }));
    setErrors((prev) => ({ ...prev, amounts: undefined, pricePerLiter: undefined }));
  }, []);

  // Rascunho aberto mantém a data em que foi criado, a menos que a pessoa escolha outra.
  const dateToSave = useCallback(
    () => (pickedDate === null && draft ? draft.date : entryDateFor(pickedDate)),
    [draft, pickedDate],
  );

  const save = useCallback(async () => {
    const vehicleId = draft?.vehicleId ?? context?.vehicle?.id;
    if (!vehicleId) return;
    const result = buildFuelEntryInput(form, { vehicleId, date: dateToSave(), stations });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      let id: string;
      const existingId = draft?.id ?? savedId;
      if (existingId) {
        id = existingId;
        const saved = await updateFuelRecord(db, { ...result.value, id });
        // O rascunho foi excluído por outro caminho (ex.: sync): nada a completar.
        if (!saved) {
          router.back();
          return;
        }
      } else {
        id = (await addFuelEntry(db, result.value)).id;
      }
      // O km mudou: os avisos de manutenção dependem dele.
      void refreshReminders(db);
      router.dismissTo({ pathname: '/', params: { saved: id } });
    } finally {
      setBusy(false);
    }
  }, [context, dateToSave, db, draft, form, router, savedId, stations]);

  /** Guarda o que foi preenchido como rascunho "Incompleto", para completar depois. */
  const saveDraft = useCallback(async () => {
    const vehicleId = draft?.vehicleId ?? context?.vehicle?.id;
    if (!vehicleId) return;
    const result = buildFuelDraftInput(form, {
      vehicleId,
      date: dateToSave(),
      stations,
      kmTouched,
    });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    // Já tem tudo o que um abastecimento completo precisa: não há o que deixar para depois.
    if (isFuelDraftComplete(result.value)) {
      await save();
      return;
    }
    setBusy(true);
    try {
      const existingId = draft?.id ?? savedId;
      if (existingId) {
        await updateFuelRecord(db, { ...result.value, id: existingId, status: 'draft' });
      } else await addFuelDraft(db, result.value);
      // O lembrete das 20h depende do rascunho.
      void refreshReminders(db);
      router.back();
    } finally {
      setBusy(false);
    }
  }, [context, dateToSave, db, draft, form, kmTouched, router, save, savedId, stations]);

  const voice = useFuelVoice({
    db,
    context,
    stations,
    form,
    kmTouched,
    setForm,
    setKmTouched,
    setErrors,
    date: dateToSave,
    onDone: ({ id, draft: isDraft }) => {
      if (isDraft) router.back();
      else router.dismissTo({ pathname: '/', params: { saved: id } });
    },
    onEdit: setSavedId,
  });

  return {
    title: draft ? 'Completar abastecimento' : 'Novo abastecimento',
    loading: context === null,
    vehicle: context?.vehicle ?? null,
    dateLabel: formatEntryDate(pickedDate ?? draft?.date ?? new Date()),
    pickerOpen,
    /** Data mostrada ao abrir o calendário. */
    pickerValue: pickedDate ?? draft?.date ?? new Date(),
    /** Abastecimento no futuro não faz sentido; antes de 1990, também não. */
    pickerMin: new Date(1990, 0, 1),
    pickerMax: new Date(),
    openDatePicker: () => setPickerOpen(true),
    closeDatePicker: () => setPickerOpen(false),
    pickDate: setPickedDate,
    form,
    amounts,
    errors,
    stationSuggestions,
    busy,
    fuelTypes: fuelTypeOptions,
    kmLabel: kmTouched ? 'Km no painel' : 'Km no painel (sugerido)',
    fullTankHelp: 'Marque quando encher o tanque até o fim. Isso deixa a média mais exata.',
    setFuelType: (fuelType: FuelType) => setForm((prev) => ({ ...prev, fuelType })),
    setPricePerLiter: (text: string) => setAmount('pricePerLiter', text),
    setLiters: (text: string) => setAmount('liters', text),
    setTotal: (text: string) => setAmount('total', text),
    setKm: (text: string) => {
      setKmTouched(true);
      setForm((prev) => ({ ...prev, km: formatKm(text) }));
      setErrors((prev) => ({ ...prev, km: undefined }));
    },
    setFullTank: (fullTank: boolean) => setForm((prev) => ({ ...prev, fullTank })),
    setStation: (station: string) => {
      setForm((prev) => ({ ...prev, station }));
      setErrors((prev) => ({ ...prev, station: undefined }));
    },
    close: () => router.back(),
    addVehicle: () => router.replace('/primeiro-veiculo'),
    save,
    saveDraft,
    isCompleting: draft !== null,
    /** "Falar" só no Novo abastecimento, antes de a voz ter salvo algo para editar. */
    canTalk: voiceEnabled && draft === null && savedId === null,
    voice,
  };
}
