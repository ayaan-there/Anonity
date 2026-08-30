export const NIGHT_ATOMIC_UNITS = 1_000_000n;

export function parseNightToAtomic(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * NIGHT_ATOMIC_UNITS + BigInt((fraction + '000000').slice(0, 6));
}

export function formatNightFromAtomic(value: bigint | number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '0';
  const atomic = BigInt(value);
  const whole = atomic / NIGHT_ATOMIC_UNITS;
  const fraction = (atomic % NIGHT_ATOMIC_UNITS).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
