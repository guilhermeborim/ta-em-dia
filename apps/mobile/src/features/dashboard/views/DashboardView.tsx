import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';

export function DashboardView() {
  const vm = useDashboardViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{vm.title}</Text>
        <Text style={styles.value}>{vm.spentLabel}</Text>
        <Text style={styles.caption}>{vm.projectionLabel}</Text>
        <Text style={styles.caption}>{vm.comparisonLabel}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 15, fontWeight: '600' },
  value: { fontSize: 32, fontWeight: '700', marginVertical: 8 },
  caption: { fontSize: 13, opacity: 0.7 },
});
