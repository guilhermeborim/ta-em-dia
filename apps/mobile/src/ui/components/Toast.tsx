import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

interface ToastProps {
  title: string;
  message?: string;
}

/** Aviso de sucesso (ex.: "Abastecimento salvo"). Só a aparência; quem exibe controla o tempo. */
export function Toast({ title, message }: ToastProps) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.box}>
      <View style={styles.check}>
        <Icon name="check" size={18} color={colors.onAccent} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" color="bg">
          {title}
        </Text>
        {message ? (
          <Text variant="small" color="text3">
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.text,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  texts: { flexShrink: 1, gap: 2 },
});
