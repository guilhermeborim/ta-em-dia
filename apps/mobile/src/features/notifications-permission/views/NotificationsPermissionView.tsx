import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, NotificationPreview, radius, spacing, Text } from '../../../ui';
import { useNotificationsPermissionViewModel } from '../viewmodels/useNotificationsPermissionViewModel';

/** Tela 6: explica os alertas antes do pedido de permissão do sistema. */
export function NotificationsPermissionView() {
  const vm = useNotificationsPermissionViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.illustration}>
          <View style={styles.bell}>
            <Icon name="bell" size={30} color={colors.onPrimary} />
          </View>
          {vm.samples.map((sample, index) => (
            <NotificationPreview
              key={sample.title}
              title={sample.title}
              text={sample.text}
              dimmed={index > 0}
            />
          ))}
        </View>

        <Text variant="h1">A gente te avisa na hora certa</Text>
        <Text variant="body" color="text2">
          Revisão, troca de óleo, IPVA, licenciamento e CNH. Só o que importa, sem spam.
        </Text>

        <View style={styles.spacer} />

        <Button label="Permitir notificações" onPress={vm.allow} loading={vm.busy} />
        <Button label="Agora não" variant="ghost" onPress={vm.skip} disabled={vm.busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 24,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  illustration: {
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
  },
  bell: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  spacer: { flexGrow: 1 },
});
