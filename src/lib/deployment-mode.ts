export const isTransparentDemoMode = import.meta.env.VITE_PAYMENT_MODE === 'unshielded-demo';

export const getBoardContractAddress = (): string | null => {
  const value = isTransparentDemoMode
    ? (import.meta.env.VITE_ANONITY_DEMO_CONTRACT as string | undefined)
    : (import.meta.env.VITE_ANONITY_CONTRACT as string | undefined);
  if (!value || !value.trim() || /^PLACEHOLDER/i.test(value)) return null;
  return value.trim();
};
