import { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_MS = 4000;

export interface ToastState {
  title: string;
  message?: string;
}

/** Aviso temporário: `show` exibe e some sozinho depois de 4 segundos; mostrar outro troca o atual. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((value: ToastState) => {
    setToast(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, show };
}
