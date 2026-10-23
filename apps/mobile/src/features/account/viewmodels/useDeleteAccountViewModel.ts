import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { loadAccount, type AccountProfile } from '../../../core/auth';
import { deleteAccount } from '../../../core/auth/accountFlow';
import { useAccountFlow } from '../../../core/auth/useAccountFlow';
import { useDb } from '../../../core/db';
import { useToast } from '../../../core/toast/useToast';
import { loadLocalData, type LocalData } from '../models/account.model';
import {
  CONFIRM_WORD,
  deleteFailureMessage,
  deleteSummary,
  isDeleteConfirmed,
} from '../models/deleteAccount.model';

/** ViewModel de Excluir conta (tela 22): resumo do que some, confirmação digitada e exclusão. */
export function useDeleteAccountViewModel() {
  const db = useDb();
  const router = useRouter();
  const flow = useAccountFlow();
  const { toast, show } = useToast();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [local, setLocal] = useState<LocalData | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadAccount(db), loadLocalData(db)]).then(([profile, data]) => {
      if (!active) return;
      setAccount(profile);
      setLocal(data);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const confirmed = isDeleteConfirmed(confirmation);

  const remove = useCallback(async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      // Dando certo, o app volta ao Login sozinho (aviso de "saiu da conta").
      const result = await deleteAccount(flow);
      if (result !== 'done') show({ title: deleteFailureMessage(result) });
    } finally {
      setBusy(false);
    }
  }, [busy, confirmed, flow, show]);

  return {
    loading: account === null || local === null,
    toast,
    busy,
    summary: account && local ? deleteSummary(local, account.provider) : [],
    confirmation,
    confirmWord: CONFIRM_WORD,
    setConfirmation,
    canDelete: confirmed && !busy,
    remove,
    cancel: () => router.back(),
  };
}
