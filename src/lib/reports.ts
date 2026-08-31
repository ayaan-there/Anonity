import { supabase } from './supabase';
import { getProgramMeta } from './programMeta';
import { ensureOrgEncryptionKeyPair, hunterEncryptionKeyPair, isReportEnvelope, openJson, sealJson, type ReportEnvelope } from './report-crypto';

export type PublicSubmission = {
  id: bigint;
  hunter: Uint8Array;
};

export type ReportContent = {
  submissionId: number;
  bountyId: number;
  asset: string;
  weakness: string;
  severity: string;
  cvssVersion: string;
  cvssVector: string;
  description: string;
  impact: string;
  createdAt: string;
};

export type ReportDraft = Omit<ReportContent, 'submissionId' | 'createdAt'>;

export type ReportComment = {
  id: number;
  submissionId: number;
  senderRole: 'org' | 'hunter';
  body: string;
  createdAt: string;
};

type ReportRow = {
  submission_id: number;
  bounty_id: number;
  org_ciphertext: string;
  hunter_ciphertext: string;
  hunter_encryption_public_key: string;
  encryption_version: number;
  created_at: string;
};

type CommentRow = {
  id: number;
  submission_id: number;
  org_ciphertext: string;
  hunter_ciphertext: string;
  sender_role: 'org' | 'hunter';
  encryption_version: number;
  created_at: string;
};

type ReportPayload = Omit<ReportContent, 'submissionId' | 'createdAt'>;
type CommentPayload = { body: string };

const REPORT_COLUMNS = 'submission_id,bounty_id,org_ciphertext,hunter_ciphertext,hunter_encryption_public_key,encryption_version,created_at';
const COMMENT_COLUMNS = 'id,submission_id,org_ciphertext,hunter_ciphertext,sender_role,encryption_version,created_at';

const parseEnvelope = (value: string): ReportEnvelope | null => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isReportEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const decryptReport = async (row: ReportRow, recipient: 'org' | 'hunter', hunterSecretKey?: Uint8Array): Promise<ReportContent | null> => {
  const envelope = parseEnvelope(recipient === 'org' ? row.org_ciphertext : row.hunter_ciphertext);
  if (!envelope) return null;
  try {
    const keys = recipient === 'org'
      ? await ensureOrgEncryptionKeyPair()
      : await hunterEncryptionKeyPair(hunterSecretKey as Uint8Array, BigInt(row.submission_id));
    const payload = await openJson<ReportPayload>(envelope, keys);
    return { ...payload, submissionId: row.submission_id, createdAt: row.created_at };
  } catch {
    return null;
  }
};

const decryptComment = async (row: CommentRow, recipient: 'org' | 'hunter', hunterSecretKey?: Uint8Array): Promise<ReportComment | null> => {
  const envelope = parseEnvelope(recipient === 'org' ? row.org_ciphertext : row.hunter_ciphertext);
  if (!envelope) return null;
  try {
    const keys = recipient === 'org'
      ? await ensureOrgEncryptionKeyPair()
      : await hunterEncryptionKeyPair(hunterSecretKey as Uint8Array, BigInt(row.submission_id));
    const payload = await openJson<CommentPayload>(envelope, keys);
    return { id: row.id, submissionId: row.submission_id, senderRole: row.sender_role, body: payload.body, createdAt: row.created_at };
  } catch {
    return null;
  }
};

export async function insertReport(submissionId: bigint, txId: string, draft: ReportDraft, orgPublicKey: string, hunterSecretKey: Uint8Array): Promise<boolean> {
  if (!supabase || !orgPublicKey.trim()) return false;
  try {
    const payload: ReportPayload = { ...draft };
    const hunterKeys = await hunterEncryptionKeyPair(hunterSecretKey, submissionId);
    const [orgEnvelope, hunterEnvelope] = await Promise.all([
      sealJson(payload, orgPublicKey),
      sealJson(payload, hunterKeys.publicKey),
    ]);
    const { error } = await supabase.functions.invoke('store-report', {
      body: {
        submission_id: Number(submissionId),
        bounty_id: Number(draft.bountyId),
        tx_id: txId,
        org_ciphertext: JSON.stringify(orgEnvelope),
        hunter_ciphertext: JSON.stringify(hunterEnvelope),
        hunter_encryption_public_key: hunterKeys.publicKey,
        encryption_version: 1,
      },
    });
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.warn('encrypted report insert failed:', error?.message ?? error);
    return false;
  }
}

export async function getReport(submissionId: bigint): Promise<ReportContent | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('reports').select(REPORT_COLUMNS).eq('submission_id', Number(submissionId)).maybeSingle();
  return data ? decryptReport(data as ReportRow, 'org') : null;
}

export async function listReportsForHunter(hunterSecretKey: Uint8Array, matchingSubmissions: PublicSubmission[]): Promise<ReportContent[]> {
  if (!supabase) return [];
  const allowedSubmissionIds = new Set(matchingSubmissions.map((submission) => Number(submission.id)));
  if (allowedSubmissionIds.size === 0) return [];
  const { data } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .in('submission_id', [...allowedSubmissionIds])
    .order('created_at', { ascending: false });
  const decrypted = await Promise.all((data ?? [])
    .filter((row) => allowedSubmissionIds.has((row as ReportRow).submission_id))
    .map((row) => decryptReport(row as ReportRow, 'hunter', hunterSecretKey)));
  return decrypted.filter((report): report is ReportContent => report !== null);
}

export async function listReportsForBounty(bountyId: bigint): Promise<ReportContent[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('reports').select(REPORT_COLUMNS).eq('bounty_id', Number(bountyId)).order('created_at', { ascending: false });
  const decrypted = await Promise.all((data ?? []).map((row) => decryptReport(row as ReportRow, 'org')));
  return decrypted.filter((report): report is ReportContent => report !== null);
}

export async function listReportComments(submissionId: bigint, viewer: 'org' | 'hunter', hunterSecretKey?: Uint8Array): Promise<ReportComment[]> {
  if (!supabase || viewer === 'hunter' && !hunterSecretKey) return [];
  const { data } = await supabase.from('report_comments').select(COMMENT_COLUMNS).eq('submission_id', Number(submissionId)).order('created_at', { ascending: true });
  const decrypted = await Promise.all((data ?? []).map((row) => decryptComment(row as CommentRow, viewer, hunterSecretKey)));
  return decrypted.filter((comment): comment is ReportComment => comment !== null);
}

export async function insertReportComment(submissionId: bigint, body: string, senderRole: 'org' | 'hunter', hunterSecretKey?: Uint8Array): Promise<boolean> {
  if (!supabase || !body.trim()) return false;
  try {
    const { data: reportData } = await supabase.from('reports').select('bounty_id,hunter_encryption_public_key').eq('submission_id', Number(submissionId)).maybeSingle();
    if (!reportData) return false;
    const meta = await getProgramMeta(BigInt(reportData.bounty_id as number));
    if (!meta?.encryptionPublicKey) return false;
    const orgKeys = await ensureOrgEncryptionKeyPair();
    const hunterPublicKey = reportData.hunter_encryption_public_key as string;
    if (senderRole === 'hunter') {
      if (!hunterSecretKey) return false;
      const derivedHunterKeys = await hunterEncryptionKeyPair(hunterSecretKey, submissionId);
      if (derivedHunterKeys.publicKey !== hunterPublicKey) return false;
    }
    const payload: CommentPayload = { body: body.trim() };
    const [orgEnvelope, hunterEnvelope] = await Promise.all([
      sealJson(payload, orgKeys.publicKey),
      sealJson(payload, hunterPublicKey),
    ]);
    const { error } = await supabase.from('report_comments').insert({
      submission_id: Number(submissionId),
      org_ciphertext: JSON.stringify(orgEnvelope),
      hunter_ciphertext: JSON.stringify(hunterEnvelope),
      sender_role: senderRole,
      encryption_version: 1,
    });
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.warn('encrypted comment insert failed:', error?.message ?? error);
    return false;
  }
}
