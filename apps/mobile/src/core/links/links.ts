/** Links externos do app: e-mail de ajuda, Termos de uso e Política de privacidade. */
export type ExternalLink = 'help' | 'terms' | 'privacy';

export interface LinksConfig {
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HELP_SUBJECT = 'Tá em Dia: ajuda';

/**
 * URL a abrir para cada link, ou `null` quando o build não tem o valor (o app mostra "Em breve").
 * Termos e Privacidade só aceitam `https://`: é a URL pública que as lojas pedem.
 */
export function externalLinkUrl(kind: ExternalLink, config: LinksConfig): string | null {
  if (kind === 'help') {
    const email = config.supportEmail.trim();
    return EMAIL.test(email) ? `mailto:${email}?subject=${encodeURIComponent(HELP_SUBJECT)}` : null;
  }
  const url = (kind === 'terms' ? config.termsUrl : config.privacyUrl).trim();
  return url.startsWith('https://') ? url : null;
}

export type LinkResult = 'opened' | 'unavailable' | 'failed';

/** Aviso depois de tentar abrir o link; `null` quando abriu. */
export function linkResultToast(
  kind: ExternalLink,
  result: LinkResult,
  supportEmail: string,
): { title: string; message?: string } | null {
  if (result === 'opened') return null;
  if (result === 'unavailable') return { title: 'Em breve' };
  return kind === 'help'
    ? { title: 'Nenhum app de e-mail', message: `Escreva para ${supportEmail.trim()}.` }
    : { title: 'Não foi possível abrir o link' };
}
