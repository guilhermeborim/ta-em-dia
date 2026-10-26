import type { FuelAmountField, FuelEntry, StationPriceRow } from '@ta-em-dia/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatKm, sameDay } from '../../../core/format';
import { useDb } from '../../../core/db';
import { loadFuelFormContext, type FuelFormContext } from '../models/fuelContext';
import {
  addFuelEntry,
  getFuelRecord,
  listFuelPriceRows,
  listStationNames,
  updateFuelRecord,
} from '../../../core/fuel';
import type { StationInput } from '../../../core/stations';
import { useFlag } from '../../../core/flags/useFlag';
import { refreshReminders } from '../../../core/reminders';
import {
  buildFuelEntryInput,
  deriveAmounts,
  emptyFuelForm,
  entryDateFor,
  formatEntryDate,
  fuelFormFromEntry,
  fuelTypeOptions,
  sanitizeAmount,
  touchAmount,
  type FuelForm,
  type FuelFormErrors,
  type FuelType,
} from '../models/fuelForm';
import {
  autoStationText,
  matchNearby,
  stationAverageText,
  stationChips,
  stationInputFor,
  type StationChip,
} from '../models/fuelStation';
import type { FuelFocusField } from '../models/fuelVoice';
import { useFuelVoice } from './useFuelVoice';
import { LOCATION_CARD, useNearbyStations } from './useNearbyStations';

/**
 * ViewModel do Novo abastecimento: sugestões, cálculo do terceiro valor, validação e gravação local.
 * Aberto com `id` na rota, é o "Editar abastecimento": carrega o registro, salva por cima dele e não
 * tem o botão de falar.
 * O botão de falar preenche o formulário; salva sozinho só se "Salvar pela fala" estiver ligado e
 * tudo certo. Se falta dado, não salva: mostra o card do que falta e leva o foco ao campo
 * (`focusRequest`).
 * Com a localização permitida, o campo "Posto" já vem com o posto mais perto (~150 m) e os chips
 * trazem o segundo mais perto e "Trocar" (ver `useNearbyStations` e `models/fuelStation`).
 */
export function useNewFuelEntryViewModel() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === 'string' ? params.id : undefined;
  const [entry, setEntry] = useState<FuelEntry | null>(null);
  const [stations, setStations] = useState<string[]>([]);
  const [context, setContext] = useState<FuelFormContext | null>(null);
  const [form, setForm] = useState<FuelForm>(emptyFuelForm);
  const [kmTouched, setKmTouched] = useState(false);
  const [errors, setErrors] = useState<FuelFormErrors>({});
  const [busy, setBusy] = useState(false);
  // `null` = hoje (a data de agora, na hora de salvar); a pessoa troca pelo calendário.
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Pedido de foco da voz; `nonce` faz o mesmo campo receber o foco de novo.
  const [focusRequest, setFocusRequest] = useState<{ field: FuelFocusField; nonce: number } | null>(
    null,
  );
  const voiceEnabled = useFlag('fuel.voice');
  const nearbyEnabled = useFlag('fuel.nearbyStation') && editId === undefined;
  const near = useNearbyStations({ db, enabled: nearbyEnabled });
  const [priceRows, setPriceRows] = useState<StationPriceRow[]>([]);
  // A pessoa mexeu no posto (digitou, escolheu chip ou tocou em Trocar): a localização não troca
  // mais o que está no campo.
  const stationTouched = useRef(false);

  useEffect(() => {
    let active = true;
    loadFuelFormContext(db).then(async (value) => {
      if (!active) return;
      if (editId) {
        const record = await getFuelRecord(db, editId);
        if (!active) return;
        // Excluído por outro caminho (ex.: sync) ou id inválido: nada a editar.
        if (!record) {
          router.back();
          return;
        }
        setEntry(record);
        setKmTouched(true);
        setForm(fuelFormFromEntry(record));
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
    listFuelPriceRows(db).then((rows) => {
      if (active) setPriceRows(rows);
    });
    return () => {
      active = false;
    };
  }, [db, editId, router]);

  // O posto mais perto entra sozinho no campo vazio (e só se a pessoa não mexeu nele).
  const { nearby, position: nearPosition } = near;
  useEffect(() => {
    setForm((prev) => {
      const text = autoStationText(prev.station, stationTouched.current, nearby);
      return text === null ? prev : { ...prev, station: text };
    });
  }, [nearby]);

  const amounts = useMemo(() => deriveAmounts(form), [form]);
  const chips = useMemo(
    () => stationChips(form.station, nearby, stations),
    [form.station, nearby, stations],
  );
  // Nomes conhecidos: os postos perto (pelo rótulo) e os já usados. A fala os reconhece e o nome
  // digitado reaproveita a grafia deles.
  const knownStations = useMemo(
    () => [...nearby.map((station) => station.label), ...stations],
    [nearby, stations],
  );
  const stationAverage = useMemo(() => {
    const current = matchNearby(form.station, nearby);
    const id =
      current?.stationId ?? (entry?.stationName === form.station ? entry?.stationId : undefined);
    return stationAverageText(priceRows, { id, name: form.station }, form.fuelType);
  }, [entry, form.fuelType, form.station, nearby, priceRows]);

  /** O posto a gravar para o nome do formulário (perto, o que já estava ou digitado). */
  const stationFor = useCallback(
    (stationName: string): StationInput =>
      stationInputFor({
        stationName,
        nearby,
        original: entry ? { id: entry.stationId, name: entry.stationName } : undefined,
        position: nearPosition(),
        isToday: pickedDate === null || sameDay(pickedDate, new Date()),
      }),
    [entry, nearPosition, nearby, pickedDate],
  );

  const setAmount = useCallback((field: FuelAmountField, text: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: sanitizeAmount(field, text),
      amountOrder: touchAmount(prev.amountOrder, field),
    }));
    setErrors((prev) => ({ ...prev, amounts: undefined, pricePerLiter: undefined }));
  }, []);

  // Editando, a data e a hora originais ficam, a menos que a pessoa escolha outro dia.
  const dateToSave = useCallback(
    () => (pickedDate === null && entry ? entry.date : entryDateFor(pickedDate)),
    [entry, pickedDate],
  );

  const save = useCallback(async () => {
    const vehicleId = entry?.vehicleId ?? context?.vehicle?.id;
    if (!vehicleId) return;
    const result = buildFuelEntryInput(form, {
      vehicleId,
      date: dateToSave(),
      stations: knownStations,
    });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    const station = stationFor(result.value.stationName ?? '');
    setBusy(true);
    try {
      if (entry) {
        await updateFuelRecord(db, { ...result.value, id: entry.id }, undefined, station);
        void refreshReminders(db);
        router.back();
        return;
      }
      const { id } = await addFuelEntry(db, result.value, { station });
      // O km mudou: os avisos de manutenção dependem dele.
      void refreshReminders(db);
      router.dismissTo({ pathname: '/', params: { saved: id } });
    } finally {
      setBusy(false);
    }
  }, [context, dateToSave, db, entry, form, knownStations, router, stationFor]);

  const voice = useFuelVoice({
    db,
    context,
    stations: knownStations,
    stationFor,
    form,
    kmTouched,
    setForm,
    setKmTouched,
    setErrors,
    date: dateToSave,
    onSaved: (id) => router.dismissTo({ pathname: '/', params: { saved: id } }),
    onFocus: (field) => setFocusRequest((prev) => ({ field, nonce: (prev?.nonce ?? 0) + 1 })),
  });

  return {
    title: entry ? 'Editar abastecimento' : 'Novo abastecimento',
    isEditing: editId !== undefined,
    loading: context === null,
    vehicle: context?.vehicle ?? null,
    dateLabel: formatEntryDate(pickedDate ?? entry?.date ?? new Date()),
    pickerOpen,
    /** Data mostrada ao abrir o calendário. */
    pickerValue: pickedDate ?? entry?.date ?? new Date(),
    /** Abastecimento no futuro não faz sentido; antes de 1990, também não. */
    pickerMin: new Date(1990, 0, 1),
    pickerMax: new Date(),
    openDatePicker: () => setPickerOpen(true),
    closeDatePicker: () => setPickerOpen(false),
    pickDate: setPickedDate,
    form,
    amounts,
    errors,
    stationChips: chips,
    /** "Média neste posto: R$ 5,89 o litro de gasolina (3 abastecimentos)", ou `null`. */
    stationAverage,
    /** Cartão antes do pedido de localização, ou o chip "Usar localização" depois do "Agora não". */
    locationOffer: near.offer,
    locationCard: LOCATION_CARD,
    allowLocation: () => void near.allow(),
    dismissLocation: () => void near.dismiss(),
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
      stationTouched.current = true;
      setForm((prev) => ({ ...prev, station }));
      setErrors((prev) => ({ ...prev, station: undefined }));
    },
    pressStationChip: (chip: StationChip) => {
      stationTouched.current = true;
      setErrors((prev) => ({ ...prev, station: undefined }));
      if (chip.kind === 'switch') {
        // "Trocar": limpa o campo e abre o teclado; os chips voltam a sugerir os postos.
        setForm((prev) => ({ ...prev, station: '' }));
        setFocusRequest((prev) => ({ field: 'station', nonce: (prev?.nonce ?? 0) + 1 }));
        return;
      }
      setForm((prev) => ({ ...prev, station: chip.label }));
    },
    close: () => router.back(),
    addVehicle: () => router.replace('/primeiro-veiculo'),
    save,
    canTalk: voiceEnabled && editId === undefined,
    focusRequest,
    voice,
    talkButton: voice.talkButton,
  };
}
