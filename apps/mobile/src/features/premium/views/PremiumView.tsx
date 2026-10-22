import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  colors,
  FeatureItem,
  Icon,
  InfoBanner,
  ListGroup,
  PremiumBadge,
  size,
  spacing,
  Text,
} from '../../../ui';
import { usePremiumViewModel } from '../viewmodels/usePremiumViewModel';

/** Tela 21: Premium em breve. Lista o que vem aí; sem preço e sem cobrança. */
export function PremiumView() {
  const vm = usePremiumViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={vm.close}
          style={styles.close}
        >
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.header}>
          <PremiumBadge />
          <Text variant="displayTitle">Mais controle, em breve</Text>
          <Text variant="body" color="text2">
            Estamos preparando recursos para quem leva o carro a sério.
          </Text>
        </View>

        <ListGroup>
          {vm.features.map((feature) => (
            <FeatureItem
              key={feature.title}
              flat
              icon={feature.icon}
              title={feature.title}
              subtitle={feature.subtitle}
            />
          ))}
        </ListGroup>

        {vm.joined ? <InfoBanner icon="check" text="Anotado! Obrigado pelo interesse." /> : null}
      </ScrollView>

      {vm.joined ? null : (
        <View style={styles.footer}>
          <Button label="Tenho interesse" onPress={vm.notifyMe} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: 14 },
  close: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  header: { gap: 10, alignItems: 'flex-start' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
