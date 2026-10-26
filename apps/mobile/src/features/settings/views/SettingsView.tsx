import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  ListGroup,
  SettingItem,
  spacing,
  SwitchRow,
  Text,
  Toast,
  TopBar,
} from '../../../ui';
import { useSettingsViewModel } from '../viewmodels/useSettingsViewModel';

/**
 * Tela 20: Configurações. Avisos por tipo, antecedência padrão dos prazos, unidades, exportar, Termos e Privacidade.
 * Sem o seletor de aparência: o app é só tema claro.
 */
export function SettingsView() {
  const vm = useSettingsViewModel();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Configurações" onBack={vm.back} />

      {vm.loading ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="caption" color="text3">
            NOTIFICAÇÕES
          </Text>
          <ListGroup>
            <SwitchRow
              flat
              label="Manutenções"
              hint="Óleo, filtros, pneus, revisão"
              value={vm.notifyMaintenance}
              onValueChange={vm.setNotifyMaintenance}
            />
            <SwitchRow
              flat
              label="Documentos"
              hint="IPVA, licenciamento, seguro, CNH"
              value={vm.notifyDocuments}
              onValueChange={vm.setNotifyDocuments}
            />
            <SwitchRow
              flat
              label="Lembrar de atualizar o km"
              hint="A cada 7 dias"
              value={vm.notifyOdometer}
              onValueChange={vm.setNotifyOdometer}
            />
            <SettingItem
              title="Antecedência"
              value={vm.documentNotifyDays}
              onPress={vm.openNotifyDays}
            />
          </ListGroup>

          <Text variant="caption" color="text3">
            ABASTECIMENTO
          </Text>
          <ListGroup>
            <SwitchRow
              flat
              label="Salvar pela fala"
              hint="Ao terminar de falar, salva sem você tocar em Salvar"
              value={vm.voiceAutoSave}
              onValueChange={vm.setVoiceAutoSave}
            />
            {vm.showStationArrival ? (
              <SwitchRow
                flat
                label="Aviso ao chegar no posto"
                hint="Lembra de registrar quando você para num posto"
                value={vm.stationArrival}
                onValueChange={vm.setStationArrival}
              />
            ) : null}
          </ListGroup>

          <Text variant="caption" color="text3">
            UNIDADES E DADOS
          </Text>
          <ListGroup>
            <SettingItem title="Distância" value="km" chevron={false} />
            <SettingItem title="Volume" value="litros" chevron={false} />
            <SettingItem title="Exportar dados" hint="Em breve" onPress={vm.exportData} />
          </ListGroup>

          <Text variant="caption" color="text3">
            SOBRE
          </Text>
          <ListGroup>
            <SettingItem title="Termos de uso" hint={vm.termsHint} onPress={vm.openTerms} />
            <SettingItem
              title="Política de privacidade"
              hint={vm.privacyHint}
              onPress={vm.openPrivacy}
            />
          </ListGroup>
        </ScrollView>
      )}

      {vm.toast ? (
        <View style={[styles.toast, { bottom: spacing.lg + insets.bottom }]}>
          <Toast title={vm.toast.title} message={vm.toast.message} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: 10 },
  toast: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
});
