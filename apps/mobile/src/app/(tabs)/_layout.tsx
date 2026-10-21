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
    </Tabs>
  );
}
