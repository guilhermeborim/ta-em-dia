import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionCard,
  AlertCard,
  BrandSymbol,
  Button,
  Chip,
  colors,
  ConsumptionCard,
  DocumentItem,
  EmptyState,
  FloatingButton,
  FuelItem,
  Icon,
  LicensePlate,
  IconAvatar,
  InfoBanner,
  InfoCard,
  iconNames,
  Logo,
  MenuItem,
  NoIntervalCard,
  NotificationPreview,
  NumberField,
  ProgressRing,
  RecordItem,
  OwnBadge,
  PremiumBadge,
  SocialButton,
  spacing,
  StatTile,
  StatusPill,
  SummaryCard,
  SyncPill,
  TabBar,
  Text,
  TextField,
  SegmentedControl,
  SuggestionItem,
  SwitchRow,
  TimelineItem,
  TopBar,
  Toast,
  typography,
  VehicleCard,
  VehicleSelector,
  DashedAddCard,
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
  const [fullTank, setFullTank] = useState(false);
  const [segment, setSegment] = useState('next');
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
          <TextField label="Modelo" required placeholder="Ex.: Gol 1.0 MPI" />
          <TextField label="Ano" required error="Informe o ano" />
          <NumberField
            label="Valor total"
            prefix="R$"
            value={number}
            onChangeText={setNumber}
            placeholder="0,00"
          />
          <NumberField label="Valor total" prefix="R$" error="Preencha 2 dos 3 valores" />
          <SwitchRow
            label="Tanque cheio"
            hint="Opcional"
            value={fullTank}
            onValueChange={setFullTank}
          />
        </Section>

        <Section title="Selos e status">
          <View style={styles.row}>
            <PremiumBadge />
            <OwnBadge />
            <SyncPill state="synced" />
            <SyncPill state="local" />
            <SyncPill state="local" label="No aparelho" />
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
            <Chip label="Hoje, 21 out" icon="calendar" />
            <Chip label="Golzinho" icon="car" />
            <Chip label="Ativar" tone="primary" />
          </View>
        </Section>

        <Section title="Controle segmentado">
          <SegmentedControl
            options={[
              { value: 'next', label: 'Próximas' },
              { value: 'done', label: 'Feitas' },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </Section>

        <Section title="Anel de progresso">
          <View style={styles.row}>
            <ProgressRing progress={0.86} color={colors.warning}>
              <Text variant="display">~500</Text>
              <Text variant="small" color="text2">
                km restantes
              </Text>
            </ProgressRing>
            <ProgressRing progress={0.35} color={colors.success} size={100} strokeWidth={12} />
          </View>
        </Section>

        <Section title="Dados em linhas e dica">
          <InfoCard
            rows={[
              { label: 'Intervalo', value: '10.000 km ou 12 meses' },
              { label: 'Última vez', value: '12 jan 2026 · 40.320 km' },
              { label: 'Próxima prevista', value: '02 nov · 50.320 km', tone: 'warning' },
            ]}
          />
          <InfoBanner icon="bell" text="Vale o que vencer primeiro." />
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
          <SummaryCard
            title="Gasto em outubro"
            amount="R$ 612,40"
            variation="8% vs set"
            variationTrend="up"
            stats={[{ label: 'Abastecimentos', value: '3 no mês' }]}
          />
        </Section>

        <Section title="Consumo">
          <ConsumptionCard periodAverage="11,8" periodCalc="3 trechos" exactAverage="12,1" />
          <ConsumptionCard periodAverage="11,8" periodCalc="3 trechos" />
          <ConsumptionCard />
        </Section>

        <Section title="Cartões de chamada e vazio">
          <ActionCard
            tone="soft"
            icon="cloud"
            title="Salve seus dados na nuvem"
            text="Entre com Google ou Apple"
          />
          <ActionCard
            icon="wrench"
            title="Ative os lembretes de manutenção"
            text="Óleo, filtros, pneus e revisão"
            avatarBackground={colors.warningSoft}
            avatarColor={colors.warning}
          />
          <EmptyState
            icon="fuel"
            title="Registre seu primeiro abastecimento"
            text="Com 2 abastecimentos de tanque cheio, o Tá em Dia já mostra seu km/l real."
            actionLabel="+ Abastecer agora"
          />
        </Section>

        <Section title="Notificação">
          <NotificationPreview
            title="Troca de óleo do Golzinho em ~500 km"
            text="Agende antes de esquecer"
          />
          <NotificationPreview
            dimmed
            title="IPVA do Golzinho vence em 10 dias"
            text="Evite multa e juros"
          />
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
          <FuelItem
            flat
            title="09 out · Shell"
            details="30,0 L · Gasolina · cheio"
            total="R$ 182,70"
            kmPerLiter="12,2 km/l"
          />
          <RecordItem
            title="Troca de óleo"
            details="12 jan 2026 · 40.320 km · Auto Center do Zé"
            cost="R$ 289,00"
          />
          <SuggestionItem
            title="Correia dentada"
            subtitle="A cada 60.000 km"
            actionLabel="Ativar"
          />
          <DocumentItem
            icon="file"
            title="IPVA"
            subtitle="Venceu em 15/10/2026"
            tone="danger"
            status="Vencido"
          />
          <DocumentItem
            icon="shield"
            title="Seguro"
            subtitle="Renova em 13/11/2026"
            tone="warning"
            status="23 dias"
          />
          <DocumentItem
            icon="shield"
            title="Licenciamento"
            subtitle="Vence em 30/09/2027"
            tone="ok"
            status="Em dia"
          />
          <MenuItem icon="car" label="Meus veículos" />
          <MenuItem icon="bell" label="Lembretes" value="Ativos" />
        </Section>

        <Section title="Linha do tempo">
          <View>
            <TimelineItem
              kind="fuel"
              title="Abastecimento"
              details="18 out · 38,2 L · 13,1 km/l"
              value="R$ 229,10"
            />
            <TimelineItem
              kind="maintenance"
              title="Troca de óleo + filtro"
              details="12 out · Auto Center do Zé"
              value="R$ 289,00"
            />
            <TimelineItem
              kind="document"
              title="Licenciamento pago"
              details="28 set · válido até set/2027"
              value="R$ 160,22"
              last
            />
          </View>
        </Section>

        <Section title="Números e placa">
          <View style={styles.row}>
            <StatTile label="Km atual" value="48.910" />
            <StatTile label="Média/dia" value="42 km" />
            <StatTile label="Custo/km" value="R$ 0,47" />
          </View>
          <View style={styles.row}>
            <LicensePlate value="BRA2E19" />
          </View>
        </Section>

        <Section title="Barra de topo">
          <View style={styles.bleed}>
            <TopBar
              title="Meus veículos"
              onBack={() => {}}
              action={{ icon: 'plus', label: 'Adicionar', onPress: () => {} }}
            />
          </View>
        </Section>

        <Section title="Cartão de veículo">
          <VehicleCard
            name="Golzinho"
            details="VW Gol 1.0 · 2019 · 48.910 km"
            status={{ tone: 'danger', label: '1 vencido' }}
          />
          <VehicleCard
            accent="oil"
            name="Moto do trampo"
            details="Honda CG 160 · 2022 · 21.300 km"
            status={{ tone: 'ok', label: 'Tudo em dia' }}
          />
          <DashedAddCard label="Adicionar veículo" />
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
  // A barra de topo já tem a margem lateral da tela.
  bleed: { marginHorizontal: -spacing.lg },
  iconCell: { width: 72, alignItems: 'center', gap: 4 },
});
