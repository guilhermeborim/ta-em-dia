import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { StatusPill, type StatusTone } from './Badges';
import { Chip } from './Chip';
import { Icon, type IconName } from './Icon';
import { IconAvatar } from './IconAvatar';
import { Text } from './Text';

interface FuelItemProps {
  /** Ex.: "18 out · Posto Ipiranga". */
  title: string;
  /** Ex.: "38,2 L · Gasolina · tanque cheio". */
  details: string;
  /** Total já formatado. Ex.: "R$ 229,10". */
  total: string;
  /** Média do trecho. Ex.: "13,1 km/l". Omita quando não der para calcular. */
  kmPerLiter?: string;
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
  onPress?: () => void;
  /** Excluir por leitor de tela, que não arrasta: aparece como ação "Excluir" do item. */
  onDelete?: () => void;
}

/** Item da lista de abastecimentos. */
export function FuelItem({
  title,
  details,
  total,
  kmPerLiter,
  flat,
  onPress,
  onDelete,
}: FuelItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${total}`}
      accessibilityHint={onPress ? 'Toque para editar' : undefined}
      accessibilityActions={onDelete ? [{ name: 'delete', label: 'Excluir' }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete') onDelete?.();
      }}
      onPress={onPress}
      style={[styles.row, styles.fuel, flat && styles.flat]}
    >
      <IconAvatar
        icon="fuel"
        size={40}
        iconSize={20}
        background={colors.primarySoft}
        color={colors.primary}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {details}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="bodyStrong">{total}</Text>
        {kmPerLiter ? (
          <Text variant="small" color="success">
            {kmPerLiter}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

interface RecordItemProps {
  /** Ex.: "Troca de óleo". */
  title: string;
  /** Ex.: "12 jan 2026 · 40.320 km · Auto Center do Zé". */
  details: string;
  /** Ex.: "R$ 289,00". Omita se não houve custo informado. */
  cost?: string;
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
  onPress?: () => void;
}

/** Item da lista de serviços de manutenção feitos. */
export function RecordItem({ title, details, cost, flat, onPress }: RecordItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cost ? `${title}, ${cost}` : title}
      onPress={onPress}
      style={[styles.row, styles.fuel, flat && styles.flat]}
    >
      <IconAvatar
        icon="wrench"
        size={40}
        iconSize={20}
        background={colors.warningSoft}
        color={colors.warning}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {details}
        </Text>
      </View>
      {cost ? <Text variant="bodyStrong">{cost}</Text> : null}
    </Pressable>
  );
}

const timelineKinds = {
  fuel: { icon: 'fuel', background: colors.primarySoft, color: colors.primary },
  maintenance: { icon: 'wrench', background: colors.warningSoft, color: colors.warning },
  document: { icon: 'file', background: colors.successSoft, color: colors.success },
} as const;

export type TimelineKind = keyof typeof timelineKinds;

interface TimelineItemProps {
  kind: TimelineKind;
  /** Ex.: "Abastecimento". */
  title: string;
  /** Ex.: "18 out · 38,2 L · 13,1 km/l". */
  details: string;
  /** Ex.: "R$ 229,10". Omita se não houve valor informado. */
  value?: string;
  /** Último da linha do tempo: sem o traço que liga ao próximo. */
  last?: boolean;
  onPress?: () => void;
}

/** Item da linha do tempo (Histórico): ícone redondo por tipo, traço e cartão com o valor. */
export function TimelineItem({ kind, title, details, value, last, onPress }: TimelineItemProps) {
  const { icon, background, color } = timelineKinds[kind];
  return (
    <View style={styles.timeline}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: background }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        {last ? null : <View style={styles.line} />}
      </View>
      <Pressable
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={value ? `${title}, ${details}, ${value}` : `${title}, ${details}`}
        disabled={!onPress}
        onPress={onPress}
        style={[styles.timelineCard, last && styles.timelineLast]}
      >
        <View style={styles.main}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="small" color="text2">
            {details}
          </Text>
        </View>
        {value ? <Text variant="bodyStrong">{value}</Text> : null}
      </Pressable>
    </View>
  );
}

const documentTones = {
  ok: { background: colors.successSoft, color: colors.success },
  warning: { background: colors.warningSoft, color: colors.warning },
  danger: { background: colors.dangerSoft, color: colors.danger },
  none: { background: colors.surface2, color: colors.text2 },
} as const;

interface DocumentItemProps {
  icon: IconName;
  /** Ex.: "IPVA". */
  title: string;
  /** Ex.: "Vence em 20/11/2026". */
  subtitle: string;
  tone: StatusTone;
  /** Ex.: "Em dia", "23 dias", "Vencido". */
  status: string;
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
  onPress?: () => void;
}

/** Item de documento e prazo: ícone na cor da situação, data, selo de status e seta. */
export function DocumentItem({
  icon,
  title,
  subtitle,
  tone,
  status,
  flat,
  onPress,
}: DocumentItemProps) {
  const color = documentTones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}, ${status}`}
      onPress={onPress}
      style={[styles.row, styles.document, flat && styles.flat]}
    >
      <IconAvatar
        icon={icon}
        size={40}
        iconSize={20}
        background={color.background}
        color={color.color}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <StatusPill tone={tone} label={status} />
      <Icon name="chevron-right" size={18} color={colors.text3} />
    </Pressable>
  );
}

interface FeatureItemProps {
  icon: IconName;
  /** Ex.: "Veículos ilimitados". */
  title: string;
  /** Ex.: "Carro, moto e da família". */
  subtitle: string;
  /** Sem cantos arredondados: para itens empilhados dentro de um grupo arredondado. */
  flat?: boolean;
}

/** Recurso listado (ex.: Premium em breve): ícone lima, título e descrição. Só informa, não toca. */
export function FeatureItem({ icon, title, subtitle, flat }: FeatureItemProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[styles.row, styles.feature, flat && styles.flat]}
    >
      <IconAvatar
        icon={icon}
        size={40}
        iconSize={20}
        background={colors.accent}
        color={colors.onAccent}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="text2">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  /** Texto ou número à direita (ex.: quantidade). */
  value?: string;
  /** Cor do valor (ex.: "1 vencido" em vermelho). Padrão: cinza. */
  valueTone?: 'warning' | 'danger';
  /** Elemento à direita no lugar do valor (ex.: selo Premium). */
  right?: ReactNode;
  onPress?: () => void;
}

/** Linha de menu (aba Mais): ícone, rótulo, valor opcional e seta. */
export function MenuItem({ icon, label, value, valueTone, right, onPress }: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.row, styles.menu]}
    >
      <IconAvatar
        icon={icon}
        size={36}
        iconSize={18}
        background={colors.surface2}
        color={colors.text}
      />
      <Text variant="bodyStrong" style={styles.main}>
        {label}
      </Text>
      {right}
      {value ? (
        <Text variant="small" color={valueTone ?? 'text3'}>
          {value}
        </Text>
      ) : null}
      <Icon name="chevron-right" size={20} color={colors.text3} />
    </Pressable>
  );
}

interface SettingItemProps {
  /** Ex.: "Antecedência". */
  title: string;
  /** Linha menor abaixo do título (ex.: "Em breve"). */
  hint?: string;
  /** Valor atual à direita (ex.: "30 e 7 dias"). */
  value?: string;
  /** Seta à direita, para mostrar que abre outra tela. Padrão: sim. */
  chevron?: boolean;
  onPress?: () => void;
}

/** Linha de Configurações: título, dica opcional, valor atual e seta. Sem ícone (ver `MenuItem`). */
export function SettingItem({ title, hint, value, chevron = true, onPress }: SettingItemProps) {
  const content = (
    <>
      <View style={styles.main}>
        <Text variant="bodyStrong">{title}</Text>
        {hint ? (
          <Text variant="small" color="text2">
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? <Text color="text2">{value}</Text> : null}
      {chevron ? <Icon name="chevron-right" size={18} color={colors.text3} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={value ? `${title}, ${value}` : title}
        style={[styles.row, styles.setting]}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={onPress}
      style={[styles.row, styles.setting]}
    >
      {content}
    </Pressable>
  );
}

interface SuggestionItemProps {
  /** Ex.: "Correia dentada". */
  title: string;
  /** Ex.: "A cada 60.000 km". */
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
}

/** Item sugerido do plano de manutenção: nome, intervalo e a ação "Ativar". */
export function SuggestionItem({ title, subtitle, actionLabel, onAction }: SuggestionItemProps) {
  return (
    <View style={[styles.row, styles.suggestion]}>
      <IconAvatar
        icon="wrench"
        size={36}
        iconSize={18}
        background={colors.surface2}
        color={colors.text2}
      />
      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="text2" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Chip label={actionLabel} tone="primary" onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  fuel: { gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.button },
  flat: { borderRadius: 0 },
  suggestion: { gap: 12, paddingLeft: 16, paddingRight: 12, paddingVertical: 12 },
  feature: { gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  document: { gap: 12, paddingLeft: 16, paddingRight: 14, paddingVertical: 14 },
  menu: { gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  setting: { gap: 12, paddingLeft: 16, paddingRight: 14, paddingVertical: 12, minHeight: 44 },
  main: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  timeline: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  rail: { alignItems: 'center', gap: 4, width: 36 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, minHeight: 28, width: 2, backgroundColor: colors.border },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  timelineLast: { marginBottom: 0 },
});
