import { Pressable, StyleSheet, View } from 'react-native';
import { colors, Text } from '../../../ui';

interface ChoiceCardProps {
  title: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Opção de escolha única da tela 24: círculo à esquerda, título e explicação. */
export function ChoiceCard({ title, hint, selected, disabled = false, onPress }: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={[styles.card, selected ? styles.selected : styles.idle, disabled && styles.disabled]}
    >
      <View style={[styles.radio, selected ? styles.radioOn : styles.radioOff]} />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="text2">
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  selected: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  idle: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  radio: { width: 22, height: 22, borderRadius: 11 },
  radioOn: { backgroundColor: colors.primary },
  radioOff: { borderWidth: 2, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  texts: { flex: 1, gap: 2 },
});
