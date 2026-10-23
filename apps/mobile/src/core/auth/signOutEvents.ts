type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa quando a pessoa saiu da conta (o app volta ao Login). Devolve como cancelar. */
export function onSignedOut(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSignedOut(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Um ouvinte com defeito não pode travar o "Sair da conta".
    }
  }
}
