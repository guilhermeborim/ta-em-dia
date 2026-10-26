import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useDb } from '../../../core/db';
import { getLocationPermission, requestLocationPermission } from '../../../core/location';
import { requestNotificationPermission } from '../../../core/notifications';
import {
  enableStationArrival,
  stationArrivalAvailable,
  stationArrivalDeps,
} from '../../../core/stationArrival';
import {
  ARRIVAL_SAMPLE,
  arrivalSetupContent,
  stepAfterBackground,
  stepAfterForeground,
  type ArrivalSetupStep,
} from '../models/stationArrivalSetup';

/**
 * ViewModel das telas que explicam o aviso ao chegar no posto: "durante o uso", depois "sempre",
 * depois liga o aviso (registra as geofences) e pede as notificações se ainda não foram dadas.
 */
export function useStationArrivalSetupViewModel() {
  const db = useDb();
  const router = useRouter();
  const deps = useMemo(() => stationArrivalDeps(db), [db]);
  const [step, setStep] = useState<ArrivalSetupStep>(() =>
    stationArrivalAvailable(deps) ? 'intro' : 'unavailable',
  );
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const run = useCallback(async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await work();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  const close = useCallback(() => router.back(), [router]);

  const enable = useCallback(async () => {
    await enableStationArrival(deps);
    if ((await requestNotificationPermission()) === 'denied') setStep('notifications');
    else close();
  }, [close, deps]);

  const allowWhileUsing = useCallback(async () => {
    let permission = await getLocationPermission();
    if (permission !== 'granted') permission = await requestLocationPermission();
    const next = stepAfterForeground(permission);
    // Já tem o "sempre" (ex.: permitiu nos ajustes): liga direto.
    if (next === 'always' && (await deps.geofencer.backgroundPermission()) === 'granted') {
      await enable();
      return;
    }
    setStep(next);
  }, [deps, enable]);

  const allowAlways = useCallback(async () => {
    const next = stepAfterBackground(await deps.geofencer.requestBackgroundPermission());
    if (next === 'enable') await enable();
    else setStep(next);
  }, [deps, enable]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const primary = useMemo(() => {
    switch (step) {
      case 'intro':
        return () => void run(allowWhileUsing);
      case 'always':
        return () => void run(allowAlways);
      case 'denied':
      case 'notifications':
        return openSettings;
      case 'unavailable':
        return close;
    }
  }, [allowAlways, allowWhileUsing, close, openSettings, run, step]);

  return {
    step,
    content: arrivalSetupContent(step, Platform.OS),
    sample: ARRIVAL_SAMPLE,
    busy,
    primary,
    secondary: close,
  };
}
