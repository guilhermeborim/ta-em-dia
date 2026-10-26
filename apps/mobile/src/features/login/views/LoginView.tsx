import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  IconAvatar,
  Logo,
  ProgressSheet,
  SocialButton,
  spacing,
  Text,
  Toast,
  type IconName,
} from '../../../ui';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';

const highlights: { icon: IconName; label: string; background: string; color: string }[] = [
  { icon: 'fuel', label: 'Gastos', background: colors.primarySoft, color: colors.primary },
  { icon: 'wrench', label: 'Revisões', background: colors.warningSoft, color: colors.warning },
  { icon: 'file', label: 'IPVA e CNH', background: colors.successSoft, color: colors.success },
];

export function LoginView() {
  const vm = useLoginViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.brand}>
          <Logo size={44} />
          <Text variant="display" style={styles.wordmark}>
            tá em dia
          </Text>
        </View>

        <View style={styles.texts}>
          <Text variant="display" style={styles.title}>
            Bora cuidar do seu carro?
          </Text>
          <Text variant="body" color="text2">
            Gastos, manutenções e documentos num lugar só. Leva 1 minuto pra começar.
          </Text>
        </View>

        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item.label} style={styles.highlight}>
              <IconAvatar
                icon={item.icon}
                size={36}
                iconSize={18}
                background={item.background}
                color={item.color}
              />
              <Text variant="bodyStrong">{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <SocialButton provider="google" disabled={vm.busy} onPress={vm.onGoogle} />
        {vm.showApple ? (
          <SocialButton provider="apple" disabled={vm.busy} onPress={vm.onApple} />
        ) : null}

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="small" color="text3">
            ou
          </Text>
          <View style={styles.line} />
        </View>

        <Button label="Continuar sem login" variant="outline" loading={vm.busy} onPress={vm.skip} />

        <Text variant="small" color="text3" style={styles.legal}>
          Ao continuar você aceita os{' '}
          <Text variant="small" color="primary" accessibilityRole="link" onPress={vm.openTerms}>
            Termos de uso
          </Text>{' '}
          e a{' '}
          <Text variant="small" color="primary" accessibilityRole="link" onPress={vm.openPrivacy}>
            Política de privacidade
          </Text>
          .
        </Text>
      </ScrollView>

      <ProgressSheet
        visible={vm.downloading}
        title="Baixando seus dados"
        text="Trazendo tudo da sua conta. Não feche o app."
      />

      {vm.toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Toast title={vm.toast} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 40,
    gap: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  wordmark: { fontSize: 32, lineHeight: 38, letterSpacing: -1.5 },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  texts: { gap: 14 },
  highlights: { flexDirection: 'row', gap: 10 },
  highlight: {
    flex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  spacer: { flexGrow: 1, minHeight: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  legal: { textAlign: 'center' },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 60 },
});
