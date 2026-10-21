import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  AlertCard,
  colors,
  IconAvatar,
  StatusPill,
  SummaryCard,
  Text,
  type IconName,
  type StatusTone,
} from '../../../ui';
import type { OnboardingSlideId } from '../models/slides';

/** Margem lateral das telas de boas-vindas (spacing.lg). */
const ILLUSTRATION_PADDING = 16;

/**
 * Cartões do design, só para mostrar (não recebem toque). A escala não muda o layout,
 * então a largura é fixada na do quadro: o cartão renderiza no tamanho real e depois encolhe.
 */
function Preview({
  children,
  rotate,
  scale,
}: {
  children: React.ReactNode;
  rotate: string;
  scale: number;
}) {
  const { width } = useWindowDimensions();
  return (
    <View
      pointerEvents="none"
      style={{ width: width - ILLUSTRATION_PADDING * 2, transform: [{ rotate }, { scale }] }}
    >
      {children}
    </View>
  );
}

function CostsIllustration() {
  return (
    <View style={styles.stack}>
      <Preview rotate="-3deg" scale={0.82}>
        <SummaryCard
          title="Gasto em outubro"
          amount="842,60"
          variation="12% vs set"
          projection="Projeção do mês: R$ 1.090"
          stats={[
            { label: 'Abastecimentos', value: '3 no mês' },
            { label: 'Custo por km', value: 'R$ 0,47' },
            { label: 'Rodou', value: '1.780 km' },
          ]}
        />
      </Preview>
      <View style={styles.overlap}>
        <Preview rotate="4deg" scale={0.82}>
          <AlertCard
            tone="warning"
            icon="wrench"
            title="Troca de óleo"
            subtitle="10.000 km ou 12 meses"
            status="Vence em 12 dias"
            progress={0.86}
            progressLabel="8.600 de 10.000 km"
            hint="≈ 500 km · 12 dias"
          />
        </Preview>
      </View>
    </View>
  );
}

function MaintenanceIllustration() {
  return (
    <View style={styles.stack}>
      <Preview rotate="-2deg" scale={0.9}>
        <AlertCard
          tone="warning"
          icon="wrench"
          title="Troca de óleo"
          subtitle="10.000 km ou 12 meses"
          status="Vence em 12 dias"
          progress={0.86}
          progressLabel="8.600 de 10.000 km"
          hint="≈ 500 km · 12 dias"
        />
      </Preview>
      <View style={styles.gap}>
        <Preview rotate="2deg" scale={0.9}>
          <AlertCard
            tone="ok"
            icon="wrench"
            title="Alinhamento"
            subtitle="A cada 10.000 km"
            status="Em dia"
            progress={0.35}
            progressLabel="3.500 de 10.000 km"
            hint="≈ 4 meses"
          />
        </Preview>
      </View>
    </View>
  );
}

const documents: {
  icon: IconName;
  title: string;
  detail: string;
  tone: Exclude<StatusTone, 'none'>;
  status: string;
}[] = [
  {
    icon: 'file',
    title: 'IPVA 2026',
    detail: 'Venceu em 15/10',
    tone: 'danger',
    status: 'Vencido',
  },
  {
    icon: 'shield',
    title: 'Licenciamento',
    detail: 'Pago até set/2027',
    tone: 'ok',
    status: 'Em dia',
  },
  { icon: 'id', title: 'CNH', detail: 'Vence em 20/11', tone: 'warning', status: '30 dias' },
];

const tones = {
  ok: { soft: colors.successSoft, strong: colors.success },
  warning: { soft: colors.warningSoft, strong: colors.warning },
  danger: { soft: colors.dangerSoft, strong: colors.danger },
};

function DocumentsIllustration() {
  return (
    <View style={styles.list}>
      {documents.map((doc) => (
        <View key={doc.title} style={styles.row}>
          <IconAvatar
            icon={doc.icon}
            size={40}
            iconSize={20}
            background={tones[doc.tone].soft}
            color={tones[doc.tone].strong}
          />
          <View style={styles.rowText}>
            <Text variant="bodyStrong">{doc.title}</Text>
            <Text variant="small" color="text2">
              {doc.detail}
            </Text>
          </View>
          <StatusPill tone={doc.tone} label={doc.status} />
        </View>
      ))}
    </View>
  );
}

const illustrations: Record<OnboardingSlideId, () => React.JSX.Element> = {
  costs: CostsIllustration,
  maintenance: MaintenanceIllustration,
  documents: DocumentsIllustration,
};

export function OnboardingIllustration({ id }: { id: OnboardingSlideId }) {
  const Illustration = illustrations[id];
  return <Illustration />;
}

const styles = StyleSheet.create({
  stack: { alignItems: 'center', alignSelf: 'stretch' },
  overlap: { marginTop: -56, alignItems: 'center', alignSelf: 'stretch' },
  gap: { marginTop: 8, alignItems: 'center', alignSelf: 'stretch' },
  list: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    gap: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, gap: 2 },
});
