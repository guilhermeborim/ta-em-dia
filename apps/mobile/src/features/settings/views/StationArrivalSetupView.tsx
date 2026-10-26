import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, NotificationPreview, radius, spacing, Text } from '../../../ui';
import { useStationArrivalSetupViewModel } from '../viewmodels/useStationArrivalSetupViewModel';

/**
 * Aviso ao chegar no posto (aberta por Configurações): explica antes de cada pedido do sistema
 * ("durante o uso" e "sempre"). Sem frame no Figma: segue a tela 6 (permissão de notificações).
 */
export function StationArrivalSetupView() {
  const vm = useStationArrivalSetupViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.illustration}>
          <View style={styles.pin}>
            <Icon name="pin" size={30} color={colors.onPrimary} />
          </View>
          <NotificationPreview title={vm.sample.title} text={vm.sample.text} />
        </View>

        <Text variant="h1" accessibilityRole="header">
          {vm.content.title}
        </Text>
        <Text variant="body" color="text2">
          {vm.content.text}
        </Text>
        {vm.content.bullets.map((bullet) => (
          <View key={bullet} style={styles.bullet}>
            <Icon name="check" size={20} color={colors.primary} />
            <Text variant="body" color="text2" style={styles.bulletText}>
              {bullet}
            </Text>
          </View>
        ))}

        <View style={styles.spacer} />

        <Button label={vm.content.primary} onPress={vm.primary} loading={vm.busy} />
        {vm.content.secondary ? (
          <Button
            label={vm.content.secondary}
            variant="ghost"
            onPress={vm.secondary}
            disabled={vm.busy}
          />
        ) : null}
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
  pin: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1 },
  spacer: { flexGrow: 1 },
});
