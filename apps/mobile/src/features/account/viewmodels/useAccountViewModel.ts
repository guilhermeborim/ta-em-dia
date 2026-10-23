import {
  canMergeVehicles,
  type LinkConflictStrategy,
  type LinkOutcome,
  type SocialProvider,
} from '@ta-em-dia/shared';
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
import { useFlag } from '../../../core/flags/useFlag';
import { useToast } from '../../../core/toast/useToast';
import {
  conflictBody,
  failureMessage,
  formatLastSync,
  isEmptyAccount,
  loadLocalData,
  mergeBlockedHint,
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
  const maxVehicles = useFlag('vehicles.max');
  const { toast, show } = useToast();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<LocalData>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [downloading, setDownloading] = useState(false);
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

  /**
   * Leva os dados para a conta. Enviar mostra a tela 23 (progresso) e, no fim, "Tudo salvo!". "Usar
   * só os da conta" traz os da conta e mostra a folha "Baixando seus dados".
   */
  const runTransfer = useCallback(
    async (outcome: LinkOutcome) => {
      if (outcome === 'switched') {
        setDownloading(true);
        try {
          const { synced } = await finishLink(flow, outcome);
          await reload();
          show(
            synced
              ? { title: 'Tudo certo!', message: 'Os dados da sua conta estão neste aparelho.' }
              : {
                  title: 'Conta conectada',
                  message: 'Não deu para baixar tudo agora. Continuamos assim que houver internet.',
                },
          );
        } finally {
          setDownloading(false);
        }
        return;
      }
      setTransfer({ done: 0, total: 0, synced: null });
      const { synced } = await finishLink(flow, outcome, (p) =>
        setTransfer({ done: p.done, total: p.total, synced: null }),
      );
      setTransfer((current) => (current ? { ...current, synced } : current));
      await reload();
      closeTimer.current = setTimeout(() => setTransfer(null), FINISHED_MS);
    },
    [flow, reload, show],
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
  const canMerge = conflict
    ? canMergeVehicles(local.vehicles, conflict.account.vehicles, maxVehicles)
    : true;

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
    deleteAccount: () => router.push('/excluir-conta'),
    conflict: conflict
      ? {
          body: conflictBody(conflict.account),
          canMerge,
          mergeHint: canMerge
            ? mergeHint(conflictLocal, conflict.account)
            : mergeBlockedHint(maxVehicles),
          confirm: confirmConflict,
          cancel: () => setConflict(null),
        }
      : null,
    downloading,
    transfer: transfer
      ? {
          title: 'Enviando seus dados',
          detail: `${transfer.done} de ${transfer.total} ${transfer.total === 1 ? 'registro' : 'registros'} · não feche o app`,
          progress: progressOf(transfer.done, transfer.total),
          finished: transfer.synced === null ? null : transfer.synced ? 'ok' : 'pending',
          finishedTitle: transfer.synced ? 'Tudo salvo!' : 'Conta conectada',
          finishedMessage: transfer.synced
            ? 'Seus dados estão seguros na sua conta.'
            : 'Não deu para terminar agora. Continuamos assim que houver internet.',
        }
      : null,
  };
}
