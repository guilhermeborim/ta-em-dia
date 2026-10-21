import { useCallback, useState } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { onboardingSlides } from '../models/slides';

/** ViewModel: slide atual, textos dos botões e saída das boas-vindas. */
export function useOnboardingViewModel() {
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const isLast = index === onboardingSlides.length - 1;

  const next = useCallback(() => {
    if (isLast) void complete();
    else setIndex((i) => i + 1);
  }, [isLast, complete]);

  return {
    slides: onboardingSlides,
    index,
    setIndex,
    isLast,
    primaryLabel: isLast ? 'Começar' : 'Avançar',
    next,
    skip: () => void complete(),
  };
}
