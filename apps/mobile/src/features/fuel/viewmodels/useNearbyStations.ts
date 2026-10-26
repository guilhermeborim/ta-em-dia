import type { LatLng } from '@ta-em-dia/shared';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getSetting, setSetting, type Db } from '../../../core/db';
import { apiUrl } from '../../../core/env/appEnv';
import {
  getCurrentPosition,
  getLocationPermission,
  requestLocationPermission,
  type LocationPermission,
} from '../../../core/location';
import {
  downloadRegionPlaces,
  findNearbyStations,
  type NearbyStation,
} from '../../../core/stations';

/** "Agora não" no cartão da localização: o cartão não volta (fica o chip "Usar localização"). */
export const LOCATION_PROMPT_DISMISSED_KEY = 'location.station_prompt_dismissed';

/** O que a tela mostra sobre a localização. */
export type LocationOffer =
  /** Nada (sem flag, editando, sem módulo, recusada de vez ou já permitida). */
  | 'none'
  /** Cartão que explica antes do pedido do sistema, com "Usar localização" e "Agora não". */
  | 'card'
  /** Depois do "Agora não": só um chip "Usar localização" entre os postos. */
  | 'chip';

/** Cartão ou chip, pela permissão e pelo "Agora não". */
export function locationOffer(
  enabled: boolean,
  permission: LocationPermission | null,
  dismissed: boolean,
): LocationOffer {
  if (!enabled || permission !== 'undetermined') return 'none';
  return dismissed ? 'chip' : 'card';
}

export const LOCATION_CARD = {
  title: 'Achar o posto pela localização',
  text: 'Com a localização, o app sugere o posto onde você está. Ela fica só no celular.',
  allow: 'Usar localização',
  dismiss: 'Agora não',
} as const;

interface NearbyDeps {
  db: Db;
  /** Flag `fuel.nearbyStation` ligada e formulário novo (a edição não usa a localização). */
  enabled: boolean;
}

/**
 * Posto pela localização na tela Abastecer: lê a permissão (pedida só aqui, depois do cartão),
 * pega a posição (fica na memória), acha os postos a até ~150 m entre os guardados no SQLite e,
 * com internet, baixa os postos da região que faltam e procura de novo.
 */
export function useNearbyStations({ db, enabled }: NearbyDeps) {
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [nearby, setNearby] = useState<NearbyStation[]>([]);
  const position = useRef<LatLng | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const locate = useCallback(async () => {
    const here = await getCurrentPosition();
    if (!here || !alive.current) return;
    position.current = here;
    setNearby(await findNearbyStations(db, here));
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const saved = await downloadRegionPlaces(
      { db, apiUrl, platform: Platform.OS, store: SecureStore },
      here,
    );
    if (saved > 0 && alive.current) setNearby(await findNearbyStations(db, here));
  }, [db]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void (async () => {
      const [status, flag] = await Promise.all([
        getLocationPermission(),
        getSetting(db, LOCATION_PROMPT_DISMISSED_KEY),
      ]);
      if (!active) return;
      setDismissed(flag === '1');
      setPermission(status);
      if (status === 'granted') await locate();
    })();
    return () => {
      active = false;
    };
  }, [db, enabled, locate]);

  const allow = useCallback(async () => {
    const status = await requestLocationPermission();
    if (!alive.current) return;
    setPermission(status);
    if (status === 'granted') await locate();
  }, [locate]);

  const getPosition = useCallback(() => position.current, []);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    await setSetting(db, LOCATION_PROMPT_DISMISSED_KEY, '1');
  }, [db]);

  return {
    /** Postos a até ~150 m, do mais perto ao mais longe (no máximo 2). */
    nearby,
    /** Posição de agora (só na memória), para o posto local novo. */
    position: getPosition,
    offer: locationOffer(enabled, permission, dismissed),
    allow,
    dismiss,
  };
}
