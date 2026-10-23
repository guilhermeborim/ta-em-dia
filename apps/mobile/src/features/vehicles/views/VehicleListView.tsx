import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  DashedAddCard,
  EmptyState,
  MenuItem,
  ReorderableList,
  spacing,
  Text,
  TopBar,
  VehicleCard,
  type VehicleCardAccent,
} from '../../../ui';
import { useVehicleListViewModel } from '../viewmodels/useVehicleListViewModel';

/** Os cartões alternam entre as duas cores da faixa. */
const accents: VehicleCardAccent[] = ['primary', 'oil'];

/** Tela 16: Meus veículos, com adicionar e reordenar (segurar e arrastar o cartão). */
export function VehicleListView() {
  const vm = useVehicleListViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Meus veículos" onBack={vm.back} />
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
              <ReorderableList
                gap={14}
                data={vm.cards}
                keyOf={(card) => card.id}
                onReorder={vm.reorder}
                enabled={vm.canReorder}
                renderItem={(card, index) => (
                  <VehicleCard
                    name={card.name}
                    icon={card.icon}
                    details={card.details}
                    accent={accents[index % accents.length]}
                    status={card.status}
                    onPress={() => vm.openVehicle(card.id)}
                    onMoveUp={card.canMoveUp ? () => vm.moveUp(card.id) : undefined}
                    onMoveDown={card.canMoveDown ? () => vm.moveDown(card.id) : undefined}
                    accessibilityHint={
                      vm.canReorder ? 'Segure e arraste para mudar a ordem' : undefined
                    }
                  />
                )}
              />
              <DashedAddCard label="Adicionar veículo" onPress={vm.addVehicle} />
              {vm.archived.length > 0 ? (
                <View style={styles.archived}>
                  <Text variant="caption" color="text3">
                    Arquivados
                  </Text>
                  {vm.archived.map((vehicle) => (
                    <MenuItem
                      key={vehicle.id}
                      icon="car"
                      label={vehicle.name}
                      onPress={() => vm.openVehicle(vehicle.id)}
                    />
                  ))}
                </View>
              ) : null}
              {vm.canReorder ? (
                <Text variant="small" color="text3" style={styles.hint}>
                  Segure um veículo e arraste para mudar a ordem.
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
  archived: { gap: 8, paddingTop: 8 },
});
