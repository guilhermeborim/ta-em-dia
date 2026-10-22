import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  EmptyState,
  Icon,
  IconAvatar,
  InfoCard,
  OwnBadge,
  ProgressRing,
  size,
  spacing,
  StatusPill,
  Text,
} from '../../../ui';
import { usePlanDetailViewModel } from '../viewmodels/usePlanDetailViewModel';

const ringColor = { ok: colors.success, warning: colors.warning, danger: colors.danger } as const;
const pillTone = { ok: 'ok', warning: 'warning', danger: 'danger', none: 'none' } as const;

/** Telas 11 (com intervalo, anel de progresso) e 11b (sem intervalo, só histórico). */
export function PlanDetailView() {
  const vm = usePlanDetailViewModel();
  const view = vm.view;

  if (vm.loading) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={vm.back}
          style={styles.round}
        >
          <Icon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="h2" numberOfLines={1} style={styles.title}>
          {view?.title ?? 'Manutenção'}
        </Text>
        {view?.own ? <OwnBadge /> : null}
        {view ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar intervalo"
            onPress={vm.edit}
            style={styles.round}
          >
            <Icon name="edit" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {!view ? (
        <View style={styles.content}>
          <EmptyState
            icon="wrench"
            title="Item não encontrado"
            text="Esse item do plano não existe mais."
            actionLabel="Voltar"
            onAction={vm.back}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {view.ring ? (
              <>
                <View style={styles.hero}>
                  <ProgressRing
                    progress={view.ring.progress}
                    color={ringColor[view.tone as keyof typeof ringColor]}
                  >
                    <Text variant="display">{view.ring.value}</Text>
                    <Text variant="small" color="text2">
                      {view.ring.caption}
                    </Text>
                  </ProgressRing>
                  <StatusPill tone={pillTone[view.tone]} label={view.status} />
                </View>
                {view.forecast ? (
                  <Text variant="small" color="text2">
                    {view.forecast}
                  </Text>
                ) : null}
              </>
            ) : (
              <View style={styles.hero}>
                <IconAvatar
                  icon="wrench"
                  size={72}
                  iconSize={36}
                  background={colors.surface2}
                  color={colors.text2}
                />
                <Text variant="h2">Sem intervalo</Text>
                <StatusPill tone="none" label={view.status} />
                <Text variant="small" color="text2" style={styles.center}>
                  {view.noIntervalText}
                </Text>
              </View>
            )}

            <InfoCard rows={view.rows} />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={view.ring ? 'Marcar como feita' : 'Registrar de novo'}
              onPress={vm.markDone}
            />
            <Button
              label={view.ring ? 'Editar intervalo' : 'Definir intervalo (opcional)'}
              variant="outline"
              onPress={vm.edit}
            />
            {view.ring && view.enabled ? (
              <Button
                label="Desativar lembrete"
                variant="ghost"
                onPress={vm.disable}
                loading={vm.busy}
              />
            ) : null}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  round: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: { flex: 1 },
  content: { padding: spacing.lg, gap: 14, flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  center: { textAlign: 'center' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
});
