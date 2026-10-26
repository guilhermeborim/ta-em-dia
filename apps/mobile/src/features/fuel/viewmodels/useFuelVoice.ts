import {
  parseFuelSpeech,
  type FuelSpeechAnswers,
  type FuelSpeechField,
  type FuelSpeechQuestion,
} from '@ta-em-dia/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Db } from '../../../core/db';
import type { ButtonVariant, SpeechCardTone } from '../../../ui';
import { addFuelEntry } from '../../../core/fuel';
import { refreshReminders } from '../../../core/reminders';
import { loadSettings } from '../../../core/settings';
import {
  isSpeechAvailable,
  requestSpeechPermission,
  startSpeech,
  type SpeechFailure,
  type SpeechSession,
} from '../../../core/speech';
import type { FuelFormContext } from '../models/fuelContext';
import type { FuelForm, FuelFormErrors } from '../models/fuelForm';
import {
  answerOptions,
  applyFuelSpeech,
  decideFuelVoice,
  type FuelFocusField,
  speechFailureText,
} from '../models/fuelVoice';

export type FuelVoiceState =
  | { step: 'idle' }
  /** O texto falado não aparece na tela: só os pontinhos em tela cheia. */
  | { step: 'listening' }
  /** `text` fica guardado para repetir a interpretação com a resposta; não aparece na tela. */
  | { step: 'question'; text: string; question: FuelSpeechQuestion }
  /** Preencheu, mas algo ficou em vermelho: não salvou. */
  | { step: 'invalid' }
  /** Faltou dado: não salvou, o campo que falta ficou em vermelho e com o foco. */
  | { step: 'missing'; message: string }
  | { step: 'failed'; message: string };

interface FuelVoiceDeps {
  db: Db;
  context: FuelFormContext | null;
  stations: readonly string[];
  form: FuelForm;
  kmTouched: boolean;
  setForm: (form: FuelForm) => void;
  setKmTouched: (value: boolean) => void;
  setErrors: (errors: FuelFormErrors) => void;
  date: () => Date;
  /** A voz salvou o abastecimento (só com "Salvar pela fala" ligado): sai da tela. */
  onSaved: (id: string) => void;
  /** Leva o cursor ao campo que falta ou está em vermelho. */
  onFocus: (field: FuelFocusField) => void;
}

/**
 * Registro por voz na tela Abastecer: ouve, pergunta o que for ambíguo e preenche o formulário.
 * Com "Salvar pela fala" ligado (Configurações), completo e válido já salva; desligado (padrão), a
 * pessoa confere e toca em Salvar. Faltando dado ou com valor fora da regra, nunca salva: deixa o
 * campo em vermelho, leva o foco a ele e o card diz o que falta. Falha de reconhecimento deixa o
 * formulário como estava.
 */
export function useFuelVoice(deps: FuelVoiceDeps) {
  const [state, setState] = useState<FuelVoiceState>({ step: 'idle' });
  const session = useRef<SpeechSession | null>(null);
  const transcript = useRef('');
  const failure = useRef<SpeechFailure | null>(null);
  const answers = useRef<FuelSpeechAnswers>({});
  // Os callbacks do reconhecimento chegam depois: leem sempre o formulário mais recente.
  const latest = useRef(deps);
  latest.current = deps;

  useEffect(
    () => () => {
      session.current?.abort();
    },
    [],
  );

  const interpret = useCallback(async (text: string) => {
    const d = latest.current;
    const vehicleId = d.context?.vehicle?.id;
    if (!vehicleId) return;
    const result = parseFuelSpeech(
      text,
      {
        lastKm: d.context?.lastFuelKm ?? d.context?.suggestedKm ?? null,
        lastFuelType: d.context?.lastFuelType ?? null,
        stations: d.stations,
      },
      answers.current,
    );
    if (result.question) {
      setState({ step: 'question', text, question: result.question });
      return;
    }
    const { voiceAutoSave } = await loadSettings(d.db);
    const applied = applyFuelSpeech(d.form, result);
    const kmTouched = d.kmTouched || applied.kmSpoken;
    const outcome = decideFuelVoice(result, applied.form, {
      vehicleId,
      date: d.date(),
      stations: d.stations,
      kmTouched,
      // Salvar sozinho só com km dito ou digitado; sem salvar, o km sugerido vale como no formulário.
      strictKm: voiceAutoSave,
      lastKm: d.context?.lastFuelKm ?? null,
    });

    if (outcome.kind === 'nothing' || outcome.kind === 'question') {
      setState({ step: 'failed', message: speechFailureText('nothing') });
      return;
    }
    d.setForm(applied.form);
    d.setKmTouched(kmTouched);
    if (outcome.kind === 'invalid' || outcome.kind === 'missing') {
      d.setErrors(outcome.errors);
      d.onFocus(outcome.focus);
      setState(
        outcome.kind === 'invalid'
          ? { step: 'invalid' }
          : { step: 'missing', message: outcome.message },
      );
      return;
    }
    d.setErrors({});
    setState({ step: 'idle' });
    if (!voiceAutoSave) return;

    const { id } = await addFuelEntry(d.db, outcome.value);
    void refreshReminders(d.db);
    d.onSaved(id);
  }, []);

  const finish = useCallback(() => {
    session.current = null;
    const text = transcript.current.trim();
    if (text === '') {
      setState({ step: 'failed', message: speechFailureText(failure.current ?? 'no-speech') });
      return;
    }
    void interpret(text);
  }, [interpret]);

  const listen = useCallback(async () => {
    const permission = await requestSpeechPermission();
    if (permission !== 'granted') {
      setState({ step: 'failed', message: speechFailureText(permission) });
      return;
    }
    transcript.current = '';
    failure.current = null;
    answers.current = {};
    setState({ step: 'listening' });
    session.current = startSpeech({
      onText: (text) => {
        transcript.current = text;
      },
      onError: (value) => {
        failure.current = value;
      },
      onEnd: finish,
    });
  }, [finish]);

  const talk = useCallback(async () => {
    if (!isSpeechAvailable()) {
      setState({ step: 'failed', message: speechFailureText('unavailable') });
      return;
    }
    // A permissão do microfone é pedida aqui, no primeiro toque.
    await listen();
  }, [listen]);

  const answer = useCallback(
    (field: FuelSpeechField) => {
      if (state.step !== 'question') return;
      answers.current = { ...answers.current, [state.question.id]: field };
      void interpret(state.text);
    },
    [interpret, state],
  );

  const stop = useCallback(() => session.current?.stop(), []);
  const dismiss = useCallback(() => setState({ step: 'idle' }), []);

  return {
    state,
    card: voiceCard(state, { talk, answer, dismiss }),
    talkButton: talkButton(state, { talk, stop }),
    /** Tela de "ouvindo" (escurece tudo e mostra os pontinhos no centro). */
    listening: state.step === 'listening',
    talk,
    /** Para de ouvir e interpreta o que já veio. */
    stop,
    answer,
    dismiss,
  };
}

interface VoiceActions {
  talk: () => void;
  stop: () => void;
  answer: (field: FuelSpeechField) => void;
  dismiss: () => void;
}

/**
 * Botão de falar ao lado de "Salvar abastecimento". Some enquanto há pergunta na tela.
 * Ouvindo, a tela inteira mostra os pontinhos e tocar nela para de ouvir.
 */
export function talkButton(
  state: FuelVoiceState,
  a: Pick<VoiceActions, 'talk' | 'stop'>,
): { listening: boolean; label: string; onPress: () => void } | null {
  if (state.step === 'listening') {
    return { listening: true, label: 'Parar de ouvir', onPress: a.stop };
  }
  if (
    state.step === 'idle' ||
    state.step === 'failed' ||
    state.step === 'invalid' ||
    state.step === 'missing'
  ) {
    return { listening: false, label: 'Falar o abastecimento', onPress: a.talk };
  }
  return null;
}

/** Cartão da voz para cada passo (textos prontos para a tela); `null` quando não há nada. */
export function voiceCard(
  state: FuelVoiceState,
  a: Omit<VoiceActions, 'stop'>,
): {
  tone: SpeechCardTone;
  title: string;
  text?: string;
  actions: { label: string; onPress: () => void; variant?: ButtonVariant }[];
} | null {
  switch (state.step) {
    case 'idle':
      return null;
    case 'listening':
      return null;
    case 'question':
      return {
        tone: 'info',
        title: state.question.text,
        actions: [
          ...answerOptions(state.question).map((option) => ({
            label: option.label,
            onPress: () => a.answer(option.field),
          })),
          { label: 'Cancelar', onPress: a.dismiss, variant: 'ghost' as const },
        ],
      };
    case 'invalid':
      return {
        tone: 'danger',
        title: 'Confira os campos em vermelho e salve',
        actions: [],
      };
    case 'missing':
      return {
        tone: 'warning',
        title: state.message,
        text: 'Preencha abaixo e toque em Salvar abastecimento.',
        actions: [],
      };
    case 'failed':
      return {
        tone: 'warning',
        title: state.message,
        actions: [{ label: 'Fechar', onPress: a.dismiss, variant: 'ghost' }],
      };
  }
}
