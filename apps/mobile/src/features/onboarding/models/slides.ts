export type OnboardingSlideId = 'costs' | 'maintenance' | 'documents';

export interface OnboardingSlide {
  id: OnboardingSlideId;
  title: string;
  text: string;
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'costs',
    title: 'Saiba quanto seu carro custa de verdade',
    text: 'Abasteceu, anotou. O Tá em Dia faz as contas: gasto do mês, km/l e custo por km.',
  },
  {
    id: 'maintenance',
    title: 'Nunca mais esqueça uma revisão',
    text: 'Óleo, pneus, IPVA e CNH: o Tá em Dia avisa antes de vencer.',
  },
  {
    id: 'documents',
    title: 'Documentos sempre em dia',
    text: 'IPVA, licenciamento, seguro e CNH com prazo e lembrete, tudo num só lugar.',
  },
];
