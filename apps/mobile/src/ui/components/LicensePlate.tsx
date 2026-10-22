import { StyleSheet, View } from 'react-native';
import { fontFamily } from '../theme/tokens';
import { Text } from './Text';

/** Cores da placa Mercosul (só aqui: não fazem parte da paleta do app). */
const plate = { border: '#1A1A1F', band: '#003399', text: '#14141A' } as const;

/** Placa Mercosul: faixa azul e letras espaçadas. O texto já vem em maiúsculas. */
export function LicensePlate({ value }: { value: string }) {
  return (
    <View accessible accessibilityLabel={`Placa ${value}`} style={styles.plate}>
      <View style={styles.band} />
      <Text variant="h2" style={styles.text}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: plate.border,
    backgroundColor: '#FFFFFF',
  },
  band: { alignSelf: 'stretch', height: 10, backgroundColor: plate.band },
  text: {
    paddingTop: 2,
    paddingBottom: 4,
    paddingHorizontal: 14,
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 2,
    color: plate.text,
  },
});
