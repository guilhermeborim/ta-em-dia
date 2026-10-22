import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

/** Grupo de itens empilhados, com cantos arredondados e uma linha fina entre eles (ex.: o menu de Mais). */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: { gap: 1, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.border },
});
