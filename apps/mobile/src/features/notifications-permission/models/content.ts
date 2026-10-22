export interface SampleNotification {
  title: string;
  text: string;
}

/** Exemplos mostrados na tela prévia (mesmos textos de docs/02-telas-e-fluxos.md). */
export const sampleNotifications: SampleNotification[] = [
  { title: 'Troca de óleo do Golzinho em ~500 km', text: 'Agende antes de esquecer' },
  { title: 'IPVA do Golzinho vence em 10 dias', text: 'Evite multa e juros' },
];
