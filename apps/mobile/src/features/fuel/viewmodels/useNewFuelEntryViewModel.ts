import { suggestStations, type FuelAmountField } from '@ta-em-dia/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatKm } from '../../../core/format';
import { useDb } from '../../../core/db';
import { loadFuelFormContext, type FuelFormContext } from '../models/fuelContext';
import { addFuelEntry, listStationNames, updateFuelRecord } from '../../../core/fuel';
import { useFlag } from '../../../core/flags/useFlag';
import { refreshReminders } from '../../../core/reminders';
import {
  buildFuelEntryInput,
  deriveAmounts,
  emptyFuelForm,
  entryDateFor,
  formatEntryDate,
  fuelTypeOptions,
  sanitizeAmount,
  touchAmount,
  type FuelForm,
  type FuelFormErrors,
  type FuelType,
} from '../models/fuelForm';
import type { FuelFocusField } from '../models/fuelVoice';
import { useFuelVoice } from './useFuelVoice';

/**
 * ViewModel do Novo abastecimento: sugestões, cálculo do terceiro valor, validação e gravação local.
 * O botão de falar preenche o formulário e salva sozinho quando está completo e válido; se falta
 * dado, não salva: mostra o card do que falta e leva o foco ao campo (`focusRequest`).
 */
export function useNewFuelEntryViewModel() {
  const db = useDb();
  const router = useRouter();
  const [stations, setStations] = useState<string[]>([]);
  const [context, setContext] = useState<FuelFormContext | null>(null);
  const [form, setForm] = useState<FuelForm>(emptyFuelForm);
  const [kmTouched, setKmTouched] = useState(false);
  const [errors, setErrors] = useState<FuelFormErrors>({});
  const [busy, setBusy] = useState(false);
  // `null` = hoje (a data de agora, na hora de salvar); a pessoa troca pelo calendário.
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Registro que a voz salvou: salvar de novo (depois de "Editar") atualiza esse mesmo id.
  const [savedId, setSavedId] = useState<string | null>(null);
  // Pedido de foco da voz; `nonce` faz o mesmo campo receber o foco de novo.
  const [focusRequest, setFocusRequest] = useState<{ field: FuelFocusField; nonce: number } | null>(
    null,
  );
  const voiceEnabled = useFlag('fuel.voice');

  useEffect(() => {
    let active = true;
    loadFuelFormContext(db).then(async (value) => {
      if (!active) return;
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
  }, [db]);

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

  const dateToSave = useCallback(() => entryDateFor(pickedDate), [pickedDate]);

  const save = useCallback(async () => {
    const vehicleId = context?.vehicle?.id;
    if (!vehicleId) return;
    const result = buildFuelEntryInput(form, { vehicleId, date: dateToSave(), stations });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      let id: string;
      if (savedId) {
        id = savedId;
        const saved = await updateFuelRecord(db, { ...result.value, id });
        // O abastecimento foi excluído por outro caminho (ex.: sync): salva como novo.
        if (!saved) id = (await addFuelEntry(db, result.value)).id;
      } else {
        id = (await addFuelEntry(db, result.value)).id;
      }
      // O km mudou: os avisos de manutenção dependem dele.
      void refreshReminders(db);
      router.dismissTo({ pathname: '/', params: { saved: id } });
    } finally {
      setBusy(false);
    }
  }, [context, dateToSave, db, form, router, savedId, stations]);

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
    onDone: (id) => router.dismissTo({ pathname: '/', params: { saved: id } }),
    onFocus: (field) => setFocusRequest((prev) => ({ field, nonce: (prev?.nonce ?? 0) + 1 })),
    onTrack: setSavedId,
  });

  return {
    title: 'Novo abastecimento',
    loading: context === null,
    vehicle: context?.vehicle ?? null,
    dateLabel: formatEntryDate(pickedDate ?? new Date()),
    pickerOpen,
    /** Data mostrada ao abrir o calendário. */
    pickerValue: pickedDate ?? new Date(),
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
    /** "Falar" some depois que a voz salvou (o formulário passa a atualizar o registro). */
    canTalk: voiceEnabled && savedId === null,
    focusRequest,
    voice,
    talkButton: voice.talkButton,
  };
}
