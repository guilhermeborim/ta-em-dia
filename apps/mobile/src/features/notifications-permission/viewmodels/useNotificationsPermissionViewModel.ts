import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { requestNotificationPermission } from '../../../core/notifications';
import { sampleNotifications } from '../models/content';

/** ViewModel: pede a permissão ao sistema e segue para o app, aceitando ou não. */
export function useNotificationsPermissionViewModel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const finish = useCallback(() => router.replace('/'), [router]);

  const allow = useCallback(async () => {
    setBusy(true);
    try {
      await requestNotificationPermission();
    } finally {
      setBusy(false);
    }
    finish();
  }, [finish]);

  return { samples: sampleNotifications, busy, allow, skip: finish };
}
