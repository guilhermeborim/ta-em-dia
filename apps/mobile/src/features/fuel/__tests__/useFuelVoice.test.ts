import { parseFuelSpeech } from '@ta-em-dia/shared';
import { talkButton, voiceCard } from '../viewmodels/useFuelVoice';

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

  it('ouvindo, não mostra cartão nem o texto falado', () => {
    expect(voiceCard({ step: 'listening' }, actions)).toBeNull();
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

  it('inválido e falha só explicam (o botão de falar continua ao lado de Salvar)', () => {
    expect(voiceCard({ step: 'invalid' }, actions)?.tone).toBe('danger');
    expect(labels(voiceCard({ step: 'failed', message: 'Sem internet' }, actions))).toEqual([
      'Fechar',
    ]);
  });
});

describe('talkButton', () => {
  it('parado: microfone que começa a ouvir', () => {
    expect(talkButton({ step: 'idle' }, actions)).toEqual({
      listening: false,
      label: 'Falar o abastecimento',
      onPress: actions.talk,
    });
  });

  it('ouvindo: pontinhos, e tocar para de ouvir', () => {
    expect(talkButton({ step: 'listening' }, actions)).toEqual({
      listening: true,
      label: 'Parar de ouvir',
      onPress: actions.stop,
    });
  });

  it('continua depois de falha ou de campo em vermelho', () => {
    expect(talkButton({ step: 'failed', message: 'x' }, actions)?.listening).toBe(false);
    expect(talkButton({ step: 'invalid' }, actions)?.listening).toBe(false);
  });

  it('some com aviso, pergunta ou resumo na tela', () => {
    expect(talkButton({ step: 'notice' }, actions)).toBeNull();
    expect(
      talkButton({ step: 'saved', id: 'x', draft: false, title: 't', summary: '' }, actions),
    ).toBeNull();
  });
});
