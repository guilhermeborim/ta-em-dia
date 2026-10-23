import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  Icon,
  InfoCard,
  primaryGradient,
  ProgressRing,
  radius,
  SocialButton,
  spacing,
  SyncPill,
  Text,
  Toast,
  TopBar,
} from '../../../ui';
import { ConflictSheet } from '../components/ConflictSheet';
import { useAccountViewModel } from '../viewmodels/useAccountViewModel';

/**
 * Tela 19: Conta. Sem login convida a salvar na nuvem (Google e, no iPhone, Apple); com login mostra
 * os dados da conta, "Sair da conta" e "Excluir conta". Também mostra a tela 23 (enviando os dados)
 * e a folha da tela 24 (a conta já tem dados).
 */
export function AccountView() {
  const vm = useAccountViewModel();

  if (vm.transfer) {
    const t = vm.transfer;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.transfer}>
          <View style={styles.transferCenter}>
            <ProgressRing progress={t.progress} color={colors.primary} size={140} strokeWidth={12}>
              <Icon name="cloud" size={32} color={colors.primary} />
            </ProgressRing>
            <Text variant="h1" style={styles.centerText}>
              {t.title}
            </Text>
            <Text variant="body" color="text2" style={styles.centerText}>
              {t.detail}
            </Text>
          </View>
          {t.finished ? (
            <View
              style={[styles.result, t.finished === 'ok' ? styles.resultOk : styles.resultPending]}
              accessibilityRole="alert"
            >
              <View
                style={[
                  styles.resultIcon,
                  t.finished === 'ok' ? styles.iconOk : styles.iconPending,
                ]}
              >
                <Icon
                  name={t.finished === 'ok' ? 'check' : 'cloud-off'}
                  size={20}
                  color={colors.onPrimary}
                />
              </View>
              <View style={styles.resultTexts}>
                <Text variant="bodyStrong">{t.finishedTitle}</Text>
                <Text variant="small" color="text2">
                  {t.finishedMessage}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Conta" onBack={vm.back} />

      {vm.loading ? null : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {vm.profile ? (
              <>
                <View style={styles.profile}>
                  <View style={styles.avatar}>
                    <Text variant="displayTitle" color="onPrimary" style={styles.initial}>
                      {vm.profile.initial}
                    </Text>
                  </View>
                  <Text variant="h2" numberOfLines={1}>
                    {vm.profile.name}
                  </Text>
                  {vm.profile.email ? (
                    <Text variant="small" color="text2" numberOfLines={1}>
                      {vm.profile.email}
                    </Text>
                  ) : null}
                  <SyncPill state="synced" />
                </View>
                <InfoCard rows={vm.profile.rows} />
              </>
            ) : (
              <>
                <LinearGradient
                  colors={[...primaryGradient.colors]}
                  start={primaryGradient.start}
                  end={primaryGradient.end}
                  style={styles.hero}
                >
                  <View style={styles.heroIcon}>
                    <Icon name="cloud" size={26} color={colors.onAccent} />
                  </View>
                  <Text variant="h1" color="onPrimary">
                    Salve seus dados na nuvem
                  </Text>
                  <Text variant="body" color="onPrimary">
                    Hoje tudo está só neste celular. Com uma conta, você troca de aparelho e não
                    perde nada.
                  </Text>
                </LinearGradient>
                <SocialButton provider="google" disabled={vm.busy} onPress={vm.linkGoogle} />
                {vm.showApple ? (
                  <SocialButton provider="apple" disabled={vm.busy} onPress={vm.linkApple} />
                ) : null}
                <InfoCard rows={vm.localRows} />
              </>
            )}
          </ScrollView>

          {vm.profile ? (
            <View style={styles.actions}>
              <Button
                label="Sair da conta"
                variant="outline"
                loading={vm.busy}
                onPress={vm.signOut}
              />
              <Button label="Excluir conta" variant="danger" onPress={vm.deleteAccount} />
            </View>
          ) : null}
        </>
      )}

      {vm.toast ? (
        <View style={styles.toast}>
          <Toast title={vm.toast.title} message={vm.toast.message} />
        </View>
      ) : null}

      {vm.conflict ? (
        <ConflictSheet
          body={vm.conflict.body}
          mergeHint={vm.conflict.mergeHint}
          onConfirm={vm.conflict.confirm}
          onCancel={vm.conflict.cancel}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: 14 },
  hero: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 24,
    borderRadius: radius.card,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  profile: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 24,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  initial: { fontSize: 32, lineHeight: 38 },
  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 60 },
  transfer: { flex: 1, padding: spacing.lg, paddingBottom: 40, justifyContent: 'space-between' },
  transferCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  centerText: { textAlign: 'center' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: 18,
  },
  resultOk: { backgroundColor: colors.successSoft },
  resultPending: { backgroundColor: colors.warningSoft },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOk: { backgroundColor: colors.success },
  iconPending: { backgroundColor: colors.warning },
  resultTexts: { flex: 1, gap: 2 },
});
