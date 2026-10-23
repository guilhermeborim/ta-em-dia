import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { LinkConflictStrategy } from '@ta-em-dia/shared';
import { Button, colors, Icon, spacing, Text } from '../../../ui';
import { ChoiceCard } from './ChoiceCard';

interface ConflictSheetProps {
  body: string;
  mergeHint: string;
  onConfirm: (strategy: LinkConflictStrategy) => void;
  onCancel: () => void;
}

/** Tela 24: a conta que entrou já tem dados; a pessoa escolhe juntar ou usar só os da conta. */
export function ConflictSheet({ body, mergeHint, onConfirm, onCancel }: ConflictSheetProps) {
  const [choice, setChoice] = useState<LinkConflictStrategy>('merge');

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel="Fechar"
        accessibilityRole="button"
        style={styles.backdrop}
        onPress={onCancel}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.icon}>
          <Icon name="refresh" size={28} color={colors.primary} />
        </View>
        <Text variant="h2" style={styles.center}>
          Essa conta já tem dados
        </Text>
        <Text variant="body" color="text2" style={styles.center}>
          {body}
        </Text>
        <View style={styles.choices} accessibilityRole="radiogroup">
          <ChoiceCard
            title="Juntar dados"
            hint={mergeHint}
            selected={choice === 'merge'}
            onPress={() => setChoice('merge')}
          />
          <ChoiceCard
            title="Usar só os da conta"
            hint="Os dados deste celular serão descartados"
            selected={choice === 'use_account'}
            onPress={() => setChoice('use_account')}
          />
        </View>
        <Button label="Continuar" onPress={() => onConfirm(choice)} style={styles.button} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  center: { textAlign: 'center' },
  choices: { alignSelf: 'stretch', gap: 14 },
  button: { alignSelf: 'stretch' },
});
