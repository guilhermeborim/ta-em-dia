import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  DashedAddCard,
  EmptyState,
  spacing,
  Text,
  TopBar,
  VehicleCard,
  type VehicleCardAccent,
} from '../../../ui';
import { useVehicleListViewModel } from '../viewmodels/useVehicleListViewModel';

/** Os cartões alternam entre as duas cores da faixa. */
const accents: VehicleCardAccent[] = ['primary', 'oil'];

/** Tela 16: Meus veículos, com adicionar e reordenar (segurar o cartão). */
export function VehicleListView() {
  const vm = useVehicleListViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Meus veículos"
        onBack={vm.back}
        action={{ icon: 'plus', label: 'Adicionar veículo', onPress: vm.addVehicle }}
      />
      {vm.loading ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          {vm.isEmpty ? (
            <EmptyState
              icon="car"
              title="Nenhum veículo ainda"
              text="Cadastre seu carro ou sua moto para registrar abastecimentos e manutenções."
              actionLabel="Adicionar veículo"
              onAction={vm.addVehicle}
            />
          ) : (
            <>
              {vm.cards.map((card, index) => (
                <VehicleCard
                  key={card.id}
                  name={card.name}
                  details={card.details}
                  accent={accents[index % accents.length]}
                  status={card.status}
                  onPress={() => vm.openVehicle(card.id)}
                  onLongPress={vm.canReorder ? () => vm.openMoveMenu(card.id) : undefined}
                  onMoveUp={card.canMoveUp ? () => vm.moveUp(card.id) : undefined}
                  onMoveDown={card.canMoveDown ? () => vm.moveDown(card.id) : undefined}
                  accessibilityHint={vm.canReorder ? 'Segure para mudar a ordem' : undefined}
                />
              ))}
              <DashedAddCard label="Adicionar veículo" onPress={vm.addVehicle} />
              {vm.canReorder ? (
                <Text variant="small" color="text3" style={styles.hint}>
                  Segure um veículo para mudar a ordem.
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40, gap: 14, flexGrow: 1 },
  hint: { textAlign: 'center' },
});
