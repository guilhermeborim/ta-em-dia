import { useRouter } from 'expo-router';
import { noticeItems } from '../models/notice';

/** ViewModel: itens do aviso e navegação (seguir para o app ou voltar ao Login). */
export function useAnonymousNoticeViewModel() {
  const router = useRouter();

  return {
    items: noticeItems,
    confirm: () => {
      // Limpa a pilha (Login + Aviso) para o botão voltar não retornar ao Login.
      router.dismissAll();
      router.replace('/primeiro-veiculo');
    },
    back: () => router.back(),
  };
}
