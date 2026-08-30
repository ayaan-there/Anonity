import { supabase } from './supabase';

export type ScopeRow = { assetType: string; target: string; maxBounty: string };
export type PrizeRange = { min: string; max: string };
export type PrizeRanges = {
  low: PrizeRange;
  medium: PrizeRange;
  high: PrizeRange;
  critical: PrizeRange;
};

export type ProgramMeta = {
  bountyId: number;
  entityName: string;
  shortDescription: string;
  cvssVersion: string;
  policy: string;
  highlights: string[];
  scope: ScopeRow[];
  exclusions: string;
  prizeRanges: PrizeRanges;
};

export type ProgramMetaInput = Omit<ProgramMeta, 'bountyId'>;

type Row = {
  bounty_id: number;
  entity_name: string;
  short_description: string;
  cvss_version: string;
  policy: string;
  highlights: string[] | null;
  scope: ScopeRow[] | null;
  exclusions: string;
  prize_ranges: PrizeRanges | null;
};

const fromRow = (r: Row): ProgramMeta => ({
  bountyId: r.bounty_id,
  entityName: r.entity_name ?? '',
  shortDescription: r.short_description ?? '',
  cvssVersion: r.cvss_version ?? 'CVSS v3.1',
  policy: r.policy ?? '',
  highlights: r.highlights ?? [],
  scope: r.scope ?? [],
  exclusions: r.exclusions ?? '',
  prizeRanges: r.prize_ranges ?? emptyPrizeRanges,
});

const toRow = (bountyId: number, m: ProgramMetaInput) => ({
  bounty_id: bountyId,
  entity_name: m.entityName,
  short_description: m.shortDescription,
  cvss_version: m.cvssVersion,
  policy: m.policy,
  highlights: m.highlights,
  scope: m.scope,
  exclusions: m.exclusions,
  prize_ranges: m.prizeRanges,
  updated_at: new Date().toISOString(),
});

export type ProgramFormSeed = ProgramMetaInput & { amount: string; deadline: string };

export const emptyPrizeRanges: PrizeRanges = {
  low: { min: '', max: '' },
  medium: { min: '', max: '' },
  high: { min: '', max: '' },
  critical: { min: '', max: '' },
};

export const emptyProgramForm: ProgramFormSeed = {
  entityName: '',
  shortDescription: '',
  cvssVersion: 'CVSS v3.1',
  policy: '',
  highlights: [],
  scope: [{ assetType: 'WILDCARD', target: '', maxBounty: '' }],
  exclusions: '',
  prizeRanges: emptyPrizeRanges,
  // The Compact contract still requires a positive legacy field; actual
  // researcher payouts are entered per report in NIGHT during review.
  amount: '1',
  deadline: '',
};

export const isEmptyMeta = (m: ProgramMetaInput): boolean =>
  !m.entityName.trim() &&
  !m.shortDescription.trim() &&
  !m.policy.trim() &&
  !m.exclusions.trim() &&
  m.highlights.length === 0 &&
  m.scope.every((s) => !s.target.trim() && !s.maxBounty.trim()) &&
  Object.values(m.prizeRanges).every((range) => !range.min.trim() && !range.max.trim());

export async function upsertProgramMeta(bountyId: bigint, meta: ProgramMetaInput): Promise<void> {
  if (!supabase || isEmptyMeta(meta)) return;
  const { error } = await supabase
    .from('program_meta')
    .upsert(toRow(Number(bountyId), meta), { onConflict: 'bounty_id' });
  if (error) console.warn('program_meta upsert failed:', error.message);
}

export async function getProgramMeta(bountyId: bigint): Promise<ProgramMeta | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('program_meta')
    .select('bounty_id,entity_name,short_description,cvss_version,policy,highlights,scope,exclusions,prize_ranges')
    .eq('bounty_id', Number(bountyId))
    .maybeSingle();
  return data ? fromRow(data as Row) : null;
}

export async function listProgramMeta(): Promise<ProgramMeta[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('program_meta')
    .select('bounty_id,entity_name,short_description,cvss_version,policy,highlights,scope,exclusions,prize_ranges');
  return (data ?? []).map((r) => fromRow(r as Row));
}

export async function listOwnedProgramIds(): Promise<Set<bigint>> {
  if (!supabase) return new Set();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return new Set();
  const { data } = await supabase
    .from('program_meta')
    .select('bounty_id')
    .eq('author', userId);
  return new Set((data ?? []).map((row) => BigInt((row as { bounty_id: number }).bounty_id)));
}

export async function isProgramOwner(bountyId: bigint): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { data } = await supabase
    .from('program_meta')
    .select('bounty_id')
    .eq('bounty_id', Number(bountyId))
    .eq('author', userId)
    .maybeSingle();
  return Boolean(data);
}
