import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface TabBarItem {
  key: string;
  label: string;
  icon: IconName;
}

interface TabBarProps {
  items: TabBarItem[];
  activeKey: string;
  onPress: (key: string) => void;
  /** Espaço da área segura embaixo (indicador home). Padrão: 30, como no design. */
  bottomInset?: number;
}

/** Barra de abas do app (5 itens). A aba ativa tem o ícone numa pílula roxa clara. */
export function TabBar({ items, activeKey, onPress, bottomInset = 30 }: TabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => onPress(item.key)}
            style={styles.item}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon name={item.icon} size={22} color={active ? colors.primary : colors.text3} />
            </View>
            <Text variant="caption" color={active ? 'primary' : 'text3'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { width: 68, alignItems: 'center', gap: 4 },
  iconWrap: {
    width: 52,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconWrapActive: { backgroundColor: colors.primarySoft },
});
