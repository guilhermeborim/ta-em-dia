import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, IconAvatar, size, spacing, Text } from '../../../ui';
import { useAnonymousNoticeViewModel } from '../viewmodels/useAnonymousNoticeViewModel';

/** Tela 4: avisa que, sem login, os dados ficam só no aparelho. */
export function AnonymousNoticeView() {
  const vm = useAnonymousNoticeViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={vm.back}
        style={styles.back}
      >
        <Icon name="chevron-left" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.hero}>
        <IconAvatar
          icon="smartphone"
          size={72}
          iconSize={34}
          background={colors.primarySoft}
          color={colors.primary}
        />
      </View>

      <Text variant="h1">Seus dados vão ficar só neste celular</Text>
      <Text variant="body" color="text2">
        Sem conta, tudo é salvo no aparelho. Funciona normal, até sem internet.
      </Text>

      <View style={styles.card}>
        {vm.items.map((item) => (
          <View key={item.title} style={styles.item}>
            <IconAvatar
              icon={item.icon}
              size={36}
              iconSize={18}
              background={item.background}
              color={item.color}
            />
            <View style={styles.itemTexts}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="small" color="text2">
                {item.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      <Button label="Entendi, continuar" onPress={vm.confirm} />
      <Button label="Voltar e entrar com conta" variant="ghost" onPress={vm.back} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  back: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: size.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  hero: { marginTop: spacing.md, alignItems: 'flex-start' },
  card: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  itemTexts: { flex: 1, gap: 2 },
  spacer: { flexGrow: 1 },
});
