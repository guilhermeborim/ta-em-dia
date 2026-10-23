import type { LinkConflictStrategy, LinkOutcome, SocialProvider } from '@ta-em-dia/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  displayName,
  initialOf,
  loadAccount,
  providerLabel,
  type AccountProfile,
} from '../../../core/auth';
import {
  finishLink,
  pendingChanges,
  resolveConflict,
  signOut,
  startLink,
  type LinkStart,
} from '../../../core/auth/accountFlow';
import { useAccountFlow } from '../../../core/auth/useAccountFlow';
import { useDb } from '../../../core/db';
import { useToast } from '../../../core/toast/useToast';
import {
  conflictBody,
  failureMessage,
  formatLastSync,
  isEmptyAccount,
  loadLocalData,
  mergeHint,
  progressOf,
  recordsText,
  type LocalData,
} from '../models/account.model';

/** Quanto a tela "Tudo salvo!" fica antes de voltar para a Conta. */
const FINISHED_MS = 1800;

interface Conflict {
  account: { vehicles: number; records: number };
  credential: Extract<LinkStart, { status: 'conflict' }>['credential'];
}

interface Transfer {
  /** `upload`: enviando o que está no aparelho; `download`: trazendo o que a conta tem. */
  mode: 'upload' | 'download';
  done: number;
  total: number;
  /** `null` enquanto trabalha; depois, se deu para terminar. */
  synced: boolean | null;
}

const EMPTY: LocalData = { vehicles: 0, records: 0, lastSyncedAt: null };

/** ViewModel da Conta (telas 19 e 19b) e dos passos de vincular (telas 23 e 24). */
export function useAccountViewModel() {
  const db = useDb();
  const router = useRouter();
  const flow = useAccountFlow();
  const { toast, show } = useToast();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<LocalData>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setAccount(await loadAccount(db));
    setLocal(await loadLocalData(db));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  /** Tela 23: leva os dados para a conta e mostra o progresso; no fim, "Tudo salvo!" e volta. */
  const runTransfer = useCallback(
    async (outcome: LinkOutcome) => {
      const mode = outcome === 'switched' ? 'download' : 'upload';
      setTransfer({ mode, done: 0, total: 0, synced: null });
      const { synced } = await finishLink(flow, outcome, (p) =>
        setTransfer({ mode, done: p.done, total: p.total, synced: null }),
      );
      setTransfer((current) => (current ? { ...current, synced } : current));
      await reload();
      closeTimer.current = setTimeout(() => setTransfer(null), FINISHED_MS);
    },
    [flow, reload],
  );

  const handle = useCallback(
    async (result: LinkStart) => {
      if (result.status === 'done') {
        await runTransfer(result.outcome);
      } else if (result.status === 'conflict') {
        if (isEmptyAccount(result.account)) {
          // A conta existe mas está vazia: não há o que perguntar, junta direto.
          await handle(await resolveConflict(flow, result.credential, 'merge'));
        } else {
          setConflict({ account: result.account, credential: result.credential });
        }
      } else {
        const message = failureMessage(result.status);
        if (message) show({ title: message });
      }
    },
    [flow, runTransfer, show],
  );

  const link = useCallback(
    async (provider: SocialProvider) => {
      if (busy) return;
      setBusy(true);
      try {
        await handle(await startLink(flow, provider));
      } finally {
        setBusy(false);
      }
    },
    [busy, flow, handle],
  );

  const confirmConflict = useCallback(
    async (strategy: LinkConflictStrategy) => {
      if (!conflict || busy) return;
      setBusy(true);
      try {
        const { credential } = conflict;
        setConflict(null);
        await handle(await resolveConflict(flow, credential, strategy));
      } finally {
        setBusy(false);
      }
    },
    [busy, conflict, flow, handle],
  );

  const doSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOut(flow);
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [flow, router]);

  const confirmSignOut = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    let pending = 0;
    try {
      // Tenta enviar o que falta antes de apagar; o que não sair é avisado.
      await finishLink(flow, 'linked');
      pending = await pendingChanges(db);
    } finally {
      setBusy(false);
    }
    const message =
      pending > 0
        ? `${recordsText(pending)} ainda não foram enviados para a conta e serão perdidos. Os outros dados continuam salvos na conta.`
        : 'Seus dados continuam salvos na conta. Este aparelho fica sem eles até você entrar de novo.';
    Alert.alert('Sair da conta?', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void doSignOut() },
    ]);
  }, [busy, db, doSignOut, flow]);

  const name = account ? displayName(account) : '';
  const conflictLocal = { vehicles: local.vehicles, records: local.records };

  return {
    loading,
    toast,
    busy,
    back: () => router.back(),
    isLoggedIn: account !== null,
    showApple: Platform.OS === 'ios',
    linkGoogle: () => link('google'),
    linkApple: () => link('apple'),
    profile: account
      ? {
          name,
          initial: initialOf(name),
          email: account.email,
          rows: [
            { label: 'Entrou com', value: providerLabel(account.provider) },
            { label: 'Último sync', value: formatLastSync(local.lastSyncedAt) },
            { label: 'Veículos', value: String(local.vehicles) },
            { label: 'Registros', value: String(local.records) },
          ],
        }
      : null,
    localRows: [
      { label: 'Modo', value: 'Sem login' },
      { label: 'Dados salvos', value: 'No aparelho' },
      { label: 'Veículos', value: String(local.vehicles) },
      { label: 'Registros', value: String(local.records) },
    ],
    signOut: confirmSignOut,
    deleteAccount: () => show({ title: 'Em breve' }),
    conflict: conflict
      ? {
          body: conflictBody(conflict.account),
          mergeHint: mergeHint(conflictLocal, conflict.account),
          confirm: confirmConflict,
          cancel: () => setConflict(null),
        }
      : null,
    transfer: transfer
      ? {
          title: transfer.mode === 'upload' ? 'Enviando seus dados' : 'Buscando seus dados',
          detail:
            transfer.mode === 'upload'
              ? `${transfer.done} de ${transfer.total} ${transfer.total === 1 ? 'registro' : 'registros'} · não feche o app`
              : 'Trazendo os dados da sua conta · não feche o app',
          progress: transfer.mode === 'upload' ? progressOf(transfer.done, transfer.total) : 0,
          finished: transfer.synced === null ? null : transfer.synced ? 'ok' : 'pending',
          finishedTitle: transfer.synced ? 'Tudo salvo!' : 'Conta conectada',
          finishedMessage: transfer.synced
            ? transfer.mode === 'upload'
              ? 'Seus dados estão seguros na sua conta.'
              : 'Os dados da sua conta estão neste aparelho.'
            : 'Não deu para terminar agora. Continuamos assim que houver internet.',
        }
      : null,
  };
}
