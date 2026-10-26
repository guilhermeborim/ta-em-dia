import {
  parseFuelSpeech,
  type FuelSpeechAnswers,
  type FuelSpeechField,
  type FuelSpeechQuestion,
} from '@ta-em-dia/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Db } from '../../../core/db';
import type { ButtonVariant, SpeechCardTone } from '../../../ui';
import { addFuelEntry, deleteFuelEntry } from '../../../core/fuel';
import { refreshReminders } from '../../../core/reminders';
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

/** Quanto tempo o resumo fica na tela antes de sair (com "Desfazer" e "Editar"). */
export const VOICE_SUMMARY_MS = 5000;

export type FuelVoiceState =
  | { step: 'idle' }
  /** O texto falado não aparece na tela: só os pontinhos no botão. */
  | { step: 'listening' }
  /** `text` fica guardado para repetir a interpretação com a resposta; não aparece na tela. */
  | { step: 'question'; text: string; question: FuelSpeechQuestion }
  /** Preencheu, mas algo ficou em vermelho: não salvou. */
  | { step: 'invalid' }
  /** Faltou dado: não salvou, o campo que falta ficou em vermelho e com o foco. */
  | { step: 'missing'; message: string }
  | { step: 'failed'; message: string }
  | { step: 'saved'; id: string; summary: string };

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
  /** Fim dos 5 s do resumo: sai da tela. */
  onDone: (id: string) => void;
  /** Leva o cursor ao campo que falta ou está em vermelho. */
  onFocus: (field: FuelFocusField) => void;
  /**
   * Registro que a voz salvou e o formulário passa a atualizar (salvar de novo não cria outro);
   * `null` quando a voz o desfez.
   */
  onTrack: (id: string | null) => void;
}

/**
 * Registro por voz na tela Abastecer: ouve, pergunta o que for ambíguo e salva sozinho quando está
 * completo e válido. Faltando dado ou com valor fora da regra, não salva: preenche o que entendeu,
 * deixa o campo em vermelho, leva o foco a ele e o card diz o que falta. Falha de reconhecimento
 * deixa o formulário como estava.
 */
export function useFuelVoice(deps: FuelVoiceDeps) {
  const [state, setState] = useState<FuelVoiceState>({ step: 'idle' });
  const session = useRef<SpeechSession | null>(null);
  const transcript = useRef('');
  const failure = useRef<SpeechFailure | null>(null);
  const answers = useRef<FuelSpeechAnswers>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Os callbacks do reconhecimento chegam depois: leem sempre o formulário mais recente.
  const latest = useRef(deps);
  latest.current = deps;

  useEffect(
    () => () => {
      session.current?.abort();
      if (timer.current) clearTimeout(timer.current);
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
    const applied = applyFuelSpeech(d.form, result);
    const kmTouched = d.kmTouched || applied.kmSpoken;
    const outcome = decideFuelVoice(result, applied.form, {
      vehicleId,
      date: d.date(),
      stations: d.stations,
      kmTouched,
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

    const { id } = await addFuelEntry(d.db, outcome.value);
    void refreshReminders(d.db);
    setState({ step: 'saved', id, summary: outcome.summary });
    // O formulário agora atualiza este registro (salvar depois não cria outro).
    d.onTrack(id);
    timer.current = setTimeout(() => latest.current.onDone(id), VOICE_SUMMARY_MS);
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

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /** Apaga o que a voz salvou; o formulário fica preenchido para corrigir ou falar de novo. */
  const undo = useCallback(async () => {
    if (state.step !== 'saved') return;
    clearTimer();
    await deleteFuelEntry(latest.current.db, state.id);
    latest.current.onTrack(null);
    void refreshReminders(latest.current.db);
    setState({ step: 'idle' });
  }, [state]);

  /** Fica na tela para corrigir; salvar atualiza o mesmo registro. */
  const edit = useCallback(() => {
    if (state.step !== 'saved') return;
    clearTimer();
    setState({ step: 'idle' });
  }, [state]);

  const stop = useCallback(() => session.current?.stop(), []);
  const dismiss = useCallback(() => setState({ step: 'idle' }), []);

  return {
    state,
    card: voiceCard(state, { talk, answer, undo, edit, dismiss }),
    talkButton: talkButton(state, { talk, stop }),
    /** Tela de "ouvindo" (escurece tudo e mostra os pontinhos no centro). */
    listening: state.step === 'listening',
    talk,
    /** Para de ouvir e interpreta o que já veio. */
    stop,
    answer,
    undo,
    edit,
    dismiss,
  };
}

interface VoiceActions {
  talk: () => void;
  stop: () => void;
  answer: (field: FuelSpeechField) => void;
  undo: () => void;
  edit: () => void;
  dismiss: () => void;
}

/**
 * Botão de falar ao lado de "Salvar abastecimento". Some enquanto há pergunta ou resumo na tela.
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
    case 'saved':
      return {
        tone: 'success',
        title: 'Abastecimento salvo',
        text: state.summary || undefined,
        actions: [
          { label: 'Desfazer', onPress: a.undo, variant: 'outline' },
          { label: 'Editar', onPress: a.edit },
        ],
      };
  }
}
