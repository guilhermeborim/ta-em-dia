import { useRouter } from 'expo-router';

/** ViewModel da aba Abastecer (provisória): só leva ao formulário. */
export function useFuelEmptyViewModel() {
  const router = useRouter();
  return { openNewEntry: () => router.push('/novo-abastecimento') };
}
