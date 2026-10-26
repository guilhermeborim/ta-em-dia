import { externalLinkUrl, linkResultToast, type LinksConfig } from '../links';

const empty: LinksConfig = { supportEmail: '', termsUrl: '', privacyUrl: '' };

describe('externalLinkUrl', () => {
  it('sem valor no build: null (a tela mostra "Em breve")', () => {
    expect(externalLinkUrl('help', empty)).toBeNull();
    expect(externalLinkUrl('terms', empty)).toBeNull();
    expect(externalLinkUrl('privacy', empty)).toBeNull();
  });

  it('ajuda abre o e-mail com assunto', () => {
    expect(externalLinkUrl('help', { ...empty, supportEmail: ' ajuda@exemplo.com ' })).toBe(
      'mailto:ajuda@exemplo.com?subject=T%C3%A1%20em%20Dia%3A%20ajuda',
    );
  });

  it('e-mail inválido não vira link', () => {
    expect(externalLinkUrl('help', { ...empty, supportEmail: 'ajuda' })).toBeNull();
  });

  it('Termos e Privacidade só com https', () => {
    const config = {
      ...empty,
      termsUrl: 'https://exemplo.com/termos',
      privacyUrl: 'http://exemplo.com/privacidade',
    };
    expect(externalLinkUrl('terms', config)).toBe('https://exemplo.com/termos');
    expect(externalLinkUrl('privacy', config)).toBeNull();
  });
});

describe('linkResultToast', () => {
  it('abriu: sem aviso; sem valor no build: "Em breve"', () => {
    expect(linkResultToast('terms', 'opened', '')).toBeNull();
    expect(linkResultToast('help', 'unavailable', '')).toEqual({ title: 'Em breve' });
  });

  it('sem app de e-mail: mostra o endereço', () => {
    expect(linkResultToast('help', 'failed', 'ajuda@exemplo.com')).toEqual({
      title: 'Nenhum app de e-mail',
      message: 'Escreva para ajuda@exemplo.com.',
    });
  });

  it('link que não abre: avisa', () => {
    expect(linkResultToast('privacy', 'failed', '')).toEqual({
      title: 'Não foi possível abrir o link',
    });
  });
});
