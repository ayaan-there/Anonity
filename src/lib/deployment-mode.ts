import { useCallback, useEffect, useState } from 'react';

export type PaymentMode = 'shielded' | 'unshielded';

const PAYMENT_MODE_STORAGE_KEY = 'anonityPaymentMode';
const PAYMENT_MODE_EVENT = 'anonity:payment-mode-change';

const isPaymentMode = (value: unknown): value is PaymentMode =>
  value === 'shielded' || value === 'unshielded';

/** Shielded is always the first-use default; unshielded is an explicit choice. */
export const getPaymentMode = (): PaymentMode => {
  try {
    const stored = localStorage.getItem(PAYMENT_MODE_STORAGE_KEY);
    return isPaymentMode(stored) ? stored : 'shielded';
  } catch {
    return 'shielded';
  }
};

export const isTransparentMode = (mode: PaymentMode): boolean => mode === 'unshielded';

export const getBoardContractAddress = (mode: PaymentMode = getPaymentMode()): string | null => {
  const value = mode === 'unshielded'
    ? (import.meta.env.VITE_ANONITY_DEMO_CONTRACT as string | undefined)
    : (import.meta.env.VITE_ANONITY_CONTRACT as string | undefined);
  if (!value || !value.trim() || /^PLACEHOLDER/i.test(value)) return null;
  return value.trim();
};

export const usePaymentMode = (): {
  mode: PaymentMode;
  isTransparent: boolean;
  setMode: (mode: PaymentMode) => void;
} => {
  const [mode, setModeState] = useState<PaymentMode>(getPaymentMode);

  useEffect(() => {
    const sync = () => setModeState(getPaymentMode());
    const onStorage = (event: StorageEvent) => {
      if (event.key === PAYMENT_MODE_STORAGE_KEY) sync();
    };
    window.addEventListener(PAYMENT_MODE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PAYMENT_MODE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setMode = useCallback((nextMode: PaymentMode) => {
    if (nextMode === mode) return;
    try {
      localStorage.setItem(PAYMENT_MODE_STORAGE_KEY, nextMode);
    } catch { /* mode still applies for this session */ }
    setModeState(nextMode);
    window.dispatchEvent(new Event(PAYMENT_MODE_EVENT));
  }, [mode]);

  return { mode, isTransparent: isTransparentMode(mode), setMode };
};
