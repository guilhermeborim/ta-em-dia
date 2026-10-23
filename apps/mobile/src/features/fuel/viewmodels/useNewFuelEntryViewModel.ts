import { suggestStations, type FuelAmountField } from '@ta-em-dia/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatKm } from '../../../core/format';
import { useDb } from '../../../core/db';
import { loadFuelFormContext, type FuelFormContext } from '../models/fuelContext';
import { addFuelEntry, listStationNames } from '../../../core/fuel';
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

/** ViewModel do Novo abastecimento: sugestões, cálculo do terceiro valor, validação e gravação local. */
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

  useEffect(() => {
    let active = true;
    loadFuelFormContext(db).then((value) => {
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
    setErrors((prev) => ({ ...prev, amounts: undefined }));
  }, []);

  const save = useCallback(async () => {
    if (!context?.vehicle) return;
    const result = buildFuelEntryInput(form, {
      vehicleId: context.vehicle.id,
      date: entryDateFor(pickedDate),
      stations,
    });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      const entry = await addFuelEntry(db, result.value);
      // O km mudou: os avisos de manutenção dependem dele.
      void refreshReminders(db);
      router.dismissTo({ pathname: '/', params: { saved: entry.id } });
    } finally {
      setBusy(false);
    }
  }, [context, db, form, pickedDate, router, stations]);

  return {
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
    setStation: (station: string) => setForm((prev) => ({ ...prev, station })),
    close: () => router.back(),
    addVehicle: () => router.replace('/primeiro-veiculo'),
    save,
  };
}
