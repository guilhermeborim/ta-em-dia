import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCard,
  BrandSymbol,
  Button,
  Chip,
  colors,
  ConsumptionCard,
  FloatingButton,
  FuelItem,
  Icon,
  IconAvatar,
  iconNames,
  Logo,
  MenuItem,
  NoIntervalCard,
  NumberField,
  OwnBadge,
  PremiumBadge,
  SocialButton,
  spacing,
  StatusPill,
  SummaryCard,
  SyncPill,
  TabBar,
  Text,
  TextField,
  Toast,
  typography,
  VehicleSelector,
  type TabBarItem,
} from '../../../ui';

const tabs: TabBarItem[] = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'fuel', label: 'Abastecer', icon: 'fuel' },
  { key: 'maintenance', label: 'Manutenção', icon: 'wrench' },
  { key: 'reports', label: 'Relatórios', icon: 'chart' },
  { key: 'more', label: 'Mais', icon: 'grid' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h3">{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/** Catálogo de todos os componentes de `src/ui`. Só para desenvolvimento. */
export function ComponentsView() {
  const [tab, setTab] = useState('home');
  const [chip, setChip] = useState('Todos');
  const [text, setText] = useState('');
  const [number, setNumber] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1">Componentes</Text>

        <Section title="Marca">
          <View style={styles.row}>
            <Logo />
            <BrandSymbol />
          </View>
        </Section>

        <Section title="Tipografia">
          {(Object.keys(typography) as (keyof typeof typography)[]).map((variant) => (
            <Text key={variant} variant={variant}>
              {variant} — Tá em Dia
            </Text>
          ))}
        </Section>

        <Section title="Cores">
          <View style={styles.row}>
            {(Object.entries(colors) as [string, string][]).map(([name, value]) => (
              <View key={name} style={styles.swatch}>
                <View style={[styles.swatchColor, { backgroundColor: value }]} />
                <Text variant="caption">{name}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Ícones">
          <View style={styles.row}>
            {iconNames.map((name) => (
              <View key={name} style={styles.iconCell}>
                <Icon name={name} />
                <Text variant="caption">{name}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Botões">
          <Button label="Primário" icon="plus" />
          <Button label="Secundário" variant="secondary" />
          <Button label="Contorno" variant="outline" />
          <Button label="Texto" variant="ghost" />
          <Button label="Excluir" variant="danger" icon="trash" />
          <Button label="Destaque" variant="accent" icon="sparkles" />
          <Button label="Carregando" loading />
          <Button label="Desabilitado" disabled />
          <SocialButton provider="google" />
          <SocialButton provider="apple" />
        </Section>

        <Section title="Campos">
          <TextField label="Posto" value={text} onChangeText={setText} placeholder="Ex.: Shell" />
          <TextField label="Odômetro" suffix="km" placeholder="0" keyboardType="numeric" />
          <NumberField
            label="Valor total"
            prefix="R$"
            value={number}
            onChangeText={setNumber}
            placeholder="0,00"
          />
        </Section>

        <Section title="Selos e status">
          <View style={styles.row}>
            <PremiumBadge />
            <OwnBadge />
            <SyncPill state="synced" />
            <SyncPill state="local" />
          </View>
          <View style={styles.row}>
            <StatusPill tone="ok" label="Em dia" />
            <StatusPill tone="warning" label="Perto" />
            <StatusPill tone="danger" label="Atrasada" />
            <StatusPill tone="none" label="Sem intervalo" />
          </View>
        </Section>

        <Section title="Chips">
          <View style={styles.row}>
            {['Todos', 'Gasolina', 'Etanol'].map((label) => (
              <Chip
                key={label}
                label={label}
                selected={chip === label}
                onPress={() => setChip(label)}
              />
            ))}
            <Chip label="Meu tipo" own />
          </View>
        </Section>

        <Section title="Avatar de ícone">
          <View style={styles.row}>
            <IconAvatar
              icon="fuel"
              size={44}
              iconSize={22}
              background={colors.primarySoft}
              color={colors.primary}
            />
            <IconAvatar
              icon="wrench"
              size={44}
              iconSize={22}
              background={colors.warningSoft}
              color={colors.warning}
            />
          </View>
        </Section>

        <Section title="Toast">
          <Toast title="Abastecimento salvo" message="Consumo: 11,8 km/l" />
        </Section>

        <Section title="Seletor de veículo">
          <VehicleSelector name="Onix 2019" details="ABC-1D23 · Flex" />
        </Section>

        <Section title="Resumo">
          <SummaryCard
            title="Gasto em outubro"
            amount="R$ 482,30"
            variation="−12% vs. setembro"
            projection="Projeção: R$ 640,00"
            stats={[
              { label: 'Abastecimentos', value: '4' },
              { label: 'Litros', value: '82' },
              { label: 'Média', value: '11,8 km/l' },
            ]}
          />
        </Section>

        <Section title="Consumo">
          <ConsumptionCard periodAverage="11,8" periodCalc="3 trechos" exactAverage="12,1" />
          <ConsumptionCard periodAverage="11,8" periodCalc="3 trechos" />
          <ConsumptionCard />
        </Section>

        <Section title="Alertas de manutenção">
          <AlertCard
            tone="ok"
            icon="droplet"
            title="Troca de óleo"
            subtitle="A cada 10.000 km"
            status="Em dia"
            progress={0.3}
            progressLabel="3.000 km rodados"
            hint="Faltam 7.000 km"
          />
          <AlertCard
            tone="warning"
            icon="wrench"
            title="Pastilhas de freio"
            subtitle="A cada 30.000 km"
            status="Perto"
            progress={0.85}
            progressLabel="25.500 km rodados"
            hint="Faltam 4.500 km"
          />
          <AlertCard
            tone="danger"
            icon="alert"
            title="Correia dentada"
            subtitle="A cada 60.000 km"
            status="Atrasada"
            progress={1}
            progressLabel="62.000 km rodados"
            hint="Passou 2.000 km"
          />
          <NoIntervalCard title="Alinhamento" lastDone="Última vez: 12 out · 50.110 km" />
          <NoIntervalCard title="Lavagem especial" own lastDone="Última vez: 3 set · 48.900 km" />
        </Section>

        <Section title="Listas">
          <FuelItem
            title="Shell"
            details="12 out · 38,5 L · Gasolina"
            total="R$ 231,00"
            kmPerLiter="11,8 km/l"
          />
          <FuelItem title="Ipiranga" details="28 set · 40 L · Etanol" total="R$ 188,00" />
          <MenuItem icon="car" label="Meus veículos" />
          <MenuItem icon="bell" label="Lembretes" value="Ativos" />
        </Section>

        <Section title="Botão flutuante">
          <View style={styles.row}>
            <FloatingButton label="Abastecer" />
          </View>
        </Section>

        <Section title="Barra de abas">
          <TabBar items={tabs} activeKey={tab} onPress={setTab} bottomInset={0} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xxl, paddingBottom: 48 },
  section: { gap: spacing.md },
  sectionBody: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  swatch: { width: 84, gap: 4 },
  swatchColor: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  iconCell: { width: 72, alignItems: 'center', gap: 4 },
});
