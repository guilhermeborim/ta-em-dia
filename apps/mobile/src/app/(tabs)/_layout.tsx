import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type TabBarItem } from '../../ui';

const items: TabBarItem[] = [
  { key: 'index', label: 'Início', icon: 'home' },
  { key: 'abastecer', label: 'Abastecer', icon: 'fuel' },
  { key: 'manutencao', label: 'Manutenção', icon: 'wrench' },
  { key: 'relatorios', label: 'Relatórios', icon: 'chart' },
  { key: 'mais', label: 'Mais', icon: 'grid' },
];

/** Telas de desenvolvimento (Status, Componentes) ficam sob a aba Mais e fora da barra. */
const parentTab: Record<string, string> = { status: 'mais', componentes: 'mais' };

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name;

  return (
    <TabBar
      items={items}
      activeKey={parentTab[current] ?? current}
      bottomInset={Math.max(insets.bottom, 16)}
      onPress={(key) => navigation.navigate(key)}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="abastecer" />
      <Tabs.Screen name="manutencao" />
      <Tabs.Screen name="relatorios" />
      <Tabs.Screen name="mais" />
      <Tabs.Screen name="status" options={{ headerShown: true, title: 'Status' }} />
      <Tabs.Screen name="componentes" options={{ headerShown: true, title: 'Componentes' }} />
    </Tabs>
  );
}
