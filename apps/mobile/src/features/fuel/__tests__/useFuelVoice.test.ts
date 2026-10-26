import { parseFuelSpeech } from '@ta-em-dia/shared';
import { voiceCard } from '../viewmodels/useFuelVoice';

const actions = {
  talk: jest.fn(),
  acceptNotice: jest.fn(),
  stop: jest.fn(),
  cancel: jest.fn(),
  answer: jest.fn(),
  undo: jest.fn(),
  edit: jest.fn(),
  dismiss: jest.fn(),
};

const labels = (card: ReturnType<typeof voiceCard>) => card?.actions.map((a) => a.label);

describe('voiceCard', () => {
  it('parado, não mostra cartão', () => {
    expect(voiceCard({ step: 'idle' }, actions)).toBeNull();
  });

  it('o aviso do áudio diz para onde ele vai', () => {
    const card = voiceCard({ step: 'notice' }, actions);
    expect(card?.text).toContain('Apple ou do Google');
    expect(labels(card)).toEqual(['Continuar', 'Agora não']);
  });

  it('ouvindo, mostra o exemplo e depois o texto ao vivo', () => {
    expect(voiceCard({ step: 'listening', text: '' }, actions)?.text).toContain('Ex.:');
    const card = voiceCard({ step: 'listening', text: '150 reais' }, actions);
    expect(card?.text).toBe('“150 reais”');
    expect(labels(card)).toEqual(['Pronto', 'Cancelar']);
  });

  it('a pergunta vira botões de resposta', () => {
    const question = parseFuelSpeech('50').question!;
    const card = voiceCard({ step: 'question', text: '50', question }, actions);
    expect(card?.title).toBe('50 é o valor ou os litros?');
    expect(labels(card)).toEqual(['Valor', 'Litros', 'Cancelar']);
    card?.actions[1]?.onPress();
    expect(actions.answer).toHaveBeenCalledWith('liters');
  });

  it('salvo: resumo com Desfazer e Editar', () => {
    const card = voiceCard(
      { step: 'saved', id: 'x', draft: false, title: 'Abastecimento salvo', summary: 'R$ 150,00' },
      actions,
    );
    expect(card).toMatchObject({ tone: 'success', text: 'R$ 150,00' });
    expect(labels(card)).toEqual(['Desfazer', 'Editar']);
  });

  it('inválido e falha deixam falar de novo', () => {
    expect(voiceCard({ step: 'invalid', text: 'x' }, actions)?.tone).toBe('danger');
    expect(labels(voiceCard({ step: 'failed', message: 'Sem internet' }, actions))).toEqual([
      'Falar de novo',
      'Fechar',
    ]);
  });
});
