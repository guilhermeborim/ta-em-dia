import { Linking } from 'react-native';
import { privacyUrl, supportEmail, termsUrl } from '../env/appEnv';
import { externalLinkUrl, linkResultToast, type ExternalLink, type LinkResult } from './links';

export { externalLinkUrl, linkResultToast, type ExternalLink, type LinksConfig } from './links';

const config = { supportEmail, termsUrl, privacyUrl };

/** O build tem o valor deste link (sem ele, a tela mostra "Em breve"). */
export function hasExternalLink(kind: ExternalLink): boolean {
  return externalLinkUrl(kind, config) !== null;
}

/**
 * Abre o link no app do sistema (e-mail ou navegador) e devolve o aviso a mostrar, ou `null` se abriu.
 * Sem o valor no build: "Em breve". Sem app para abrir: diz como seguir.
 */
export async function openExternalLink(
  kind: ExternalLink,
): Promise<{ title: string; message?: string } | null> {
  const url = externalLinkUrl(kind, config);
  let result: LinkResult = 'unavailable';
  if (url) {
    try {
      await Linking.openURL(url);
      result = 'opened';
    } catch {
      result = 'failed';
    }
  }
  return linkResultToast(kind, result, supportEmail);
}
