import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AccountCard,
  colors,
  FloatingButton,
  ListGroup,
  MenuItem,
  PremiumBadge,
  spacing,
  Text,
  Toast,
} from '../../../ui';
import { useMoreViewModel } from '../viewmodels/useMoreViewModel';

/** Tela 15: aba Mais. Conta, veículos, documentos, histórico, configurações, Premium e ajuda. */
export function MoreView() {
  const vm = useMoreViewModel();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1">Mais</Text>

        <AccountCard name={vm.account.name} sync={vm.account.sync} onPress={vm.openAccount} />

        <ListGroup>
          <MenuItem
            icon="car"
            label="Meus veículos"
            value={vm.vehicleCount}
            onPress={vm.openVehicles}
          />
          <MenuItem
            icon="file"
            label="Documentos e prazos"
            value={vm.documentsBadge?.text}
            valueTone={vm.documentsBadge?.tone}
            onPress={vm.openDocuments}
          />
          <MenuItem icon="history" label="Histórico" onPress={vm.openHistory} />
        </ListGroup>

        <ListGroup>
          <MenuItem icon="user" label="Conta" onPress={vm.openAccount} />
          <MenuItem icon="sliders" label="Configurações" onPress={vm.openSettings} />
        </ListGroup>

        <ListGroup>
          <MenuItem
            icon="crown"
            label="Premium"
            right={<PremiumBadge />}
            onPress={vm.openPremium}
          />
          <MenuItem icon="help" label="Ajuda e contato" onPress={vm.openHelp} />
        </ListGroup>

        {vm.showDevTools ? (
          <View style={styles.dev}>
            <Text variant="small" color="text3">
              Só em desenvolvimento
            </Text>
            <ListGroup>
              <MenuItem icon="gauge" label="Status do app" onPress={vm.openStatus} />
              <MenuItem
                icon="sliders"
                label="Catálogo de componentes"
                onPress={vm.openComponents}
              />
            </ListGroup>
          </View>
        ) : null}
      </ScrollView>

      {vm.toast ? (
        <View style={styles.toast}>
          <Toast title={vm.toast.title} message={vm.toast.message} />
        </View>
      ) : null}

      <View style={styles.fab}>
        <FloatingButton label="Abastecer" onPress={vm.openFuel} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  // Espaço para o botão flutuante não cobrir o último item.
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 96, gap: 14 },
  dev: { gap: spacing.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  // O aviso fica acima do botão flutuante.
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg + 56 + spacing.md,
  },
});
