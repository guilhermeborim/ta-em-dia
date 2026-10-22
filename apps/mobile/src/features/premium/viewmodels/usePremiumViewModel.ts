import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useDb } from '../../../core/db';
import { isOnWaitlist, joinWaitlist, premiumFeatures } from '../models/premium';

/** ViewModel de Premium em breve (tela 21): lista de recursos e o "Tenho interesse". */
export function usePremiumViewModel() {
  const db = useDb();
  const router = useRouter();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let active = true;
    isOnWaitlist(db).then((value) => {
      if (active) setJoined(value);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const notifyMe = useCallback(async () => {
    setJoined(true);
    await joinWaitlist(db);
  }, [db]);

  return {
    features: premiumFeatures,
    joined,
    notifyMe,
    close: () => router.back(),
  };
}
