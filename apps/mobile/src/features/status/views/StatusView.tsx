import { Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatusViewModel } from '../viewmodels/useStatusViewModel';

export function StatusView() {
  const vm = useStatusViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{vm.title}</Text>
        <Text style={styles.line}>{vm.envLabel}</Text>
        <Text style={styles.line}>{vm.apiUrlLabel}</Text>
        <Text style={styles.status}>{vm.apiLabel}</Text>
        {vm.apiEnvLabel && <Text style={styles.line}>{vm.apiEnvLabel}</Text>}
        {vm.versionLabel && <Text style={styles.line}>{vm.versionLabel}</Text>}
        <Button title="Testar de novo" onPress={vm.refresh} disabled={vm.loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  line: { fontSize: 13, opacity: 0.7 },
  status: { fontSize: 18, fontWeight: '600', marginVertical: 8 },
});
