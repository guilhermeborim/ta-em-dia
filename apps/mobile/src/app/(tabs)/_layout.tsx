import { Tabs } from 'expo-router';
import { appEnv } from '../../core/env/appEnv';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      {/* Diagnóstico: só aparece fora de produção */}
      <Tabs.Screen
        name="status"
        options={{ title: 'Status', href: appEnv === 'production' ? null : '/status' }}
      />
      {/* Catálogo de componentes: só aparece fora de produção */}
      <Tabs.Screen
        name="componentes"
        options={{
          title: 'Componentes',
          href: appEnv === 'production' ? null : '/componentes',
        }}
      />
    </Tabs>
  );
}
