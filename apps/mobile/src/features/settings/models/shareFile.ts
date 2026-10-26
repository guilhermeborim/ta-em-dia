import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Grava o JSON num arquivo temporário e abre o menu de compartilhar do sistema.
 * `false` quando o aparelho não tem como compartilhar.
 */
export async function shareJsonFile(name: string, content: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Exportar meus dados',
  });
  return true;
}
