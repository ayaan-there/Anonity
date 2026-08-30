import { supabase } from './supabase';

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
  payoutAddress: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentTxId: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  createdAt: string;
};

export type ReportDraft = Pick<ReportContent, 'bountyId' | 'asset' | 'weakness' | 'severity' | 'cvssVersion' | 'cvssVector' | 'description' | 'impact' | 'payoutAddress'>;

export type ReportComment = {
  id: number;
  submissionId: number;
  author: string;
  body: string;
  createdAt: string;
};

type Row = {
  submission_id: number;
  bounty_id: number;
  asset: string;
  weakness: string;
  severity: string;
  cvss_version: string;
  cvss_vector: string;
  description: string;
  impact: string;
  payout_address: string | null;
  payment_status: 'unpaid' | 'paid';
  created_at: string;
};

type CommentRow = {
  id: number;
  submission_id: number;
  author: string;
  body: string;
  created_at: string;
};

const fromRow = (r: Row): ReportContent => ({
  submissionId: r.submission_id,
  bountyId: r.bounty_id,
  asset: r.asset ?? '',
  weakness: r.weakness ?? '',
  severity: r.severity ?? '',
  cvssVersion: r.cvss_version ?? 'CVSS v3.1',
  cvssVector: r.cvss_vector ?? '',
  description: r.description ?? '',
  impact: r.impact ?? '',
  payoutAddress: r.payout_address ?? '',
  paymentStatus: r.payment_status ?? 'unpaid',
  paymentTxId: null,
  paidAmount: null,
  paidAt: null,
  createdAt: r.created_at,
});

const fromCommentRow = (r: CommentRow): ReportComment => ({
  id: r.id,
  submissionId: r.submission_id,
  author: r.author,
  body: r.body,
  createdAt: r.created_at,
});

export async function insertReport(submissionId: bigint, draft: ReportDraft): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('reports').insert({
    submission_id: Number(submissionId),
    bounty_id: Number(draft.bountyId),
    asset: draft.asset,
    weakness: draft.weakness,
    severity: draft.severity,
    cvss_version: draft.cvssVersion,
    cvss_vector: draft.cvssVector,
    description: draft.description,
    impact: draft.impact,
    payout_address: draft.payoutAddress || null,
  });
  if (error) {
    console.warn('report insert failed:', error.message);
    return false;
  }
  return true;
}

export async function getReport(submissionId: bigint): Promise<ReportContent | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('reports')
    .select('submission_id,bounty_id,asset,weakness,severity,cvss_version,cvss_vector,description,impact,payout_address,payment_status,created_at')
    .eq('submission_id', Number(submissionId))
    .maybeSingle();
  return data ? hydratePayment(fromRow(data as Row)) : null;
}

async function hydratePayment(report: ReportContent): Promise<ReportContent> {
  if (!supabase) return report;
  const { data } = await supabase.from('report_payments').select('tx_reference,amount,paid_at').eq('submission_id', report.submissionId).maybeSingle();
  return data ? { ...report, paymentStatus: 'paid', paymentTxId: data.tx_reference, paidAmount: Number(data.amount), paidAt: data.paid_at } : report;
}

export async function listReportsForCurrentHunter(): Promise<ReportContent[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from('reports')
    .select('submission_id,bounty_id,asset,weakness,severity,cvss_version,cvss_vector,description,impact,payout_address,payment_status,created_at')
    .eq('author', userId)
    .order('created_at', { ascending: false });
  return Promise.all((data ?? []).map((r) => hydratePayment(fromRow(r as Row))));
}

export async function listReportsForBounty(bountyId: bigint): Promise<ReportContent[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('reports')
    .select('submission_id,bounty_id,asset,weakness,severity,cvss_version,cvss_vector,description,impact,payout_address,payment_status,created_at')
    .eq('bounty_id', Number(bountyId));
  return Promise.all((data ?? []).map((r) => hydratePayment(fromRow(r as Row))));
}

export async function markReportPaid(submissionId: bigint, amount: bigint, recipientAddress: string, paymentTxId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('report_payments').insert({
    submission_id: Number(submissionId),
    recipient_address: recipientAddress,
    amount: Number(amount),
    tx_reference: paymentTxId,
  });
  if (error) {
    console.warn('report payment update failed:', error.message);
    return false;
  }
  return true;
}

export async function listReportComments(submissionId: bigint): Promise<ReportComment[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('report_comments')
    .select('id,submission_id,author,body,created_at')
    .eq('submission_id', Number(submissionId))
    .order('created_at', { ascending: true });
  return (data ?? []).map((r) => fromCommentRow(r as CommentRow));
}

export async function insertReportComment(submissionId: bigint, body: string): Promise<boolean> {
  if (!supabase || !body.trim()) return false;
  const { error } = await supabase.from('report_comments').insert({
    submission_id: Number(submissionId),
    body: body.trim(),
  });
  if (error) {
    console.warn('report comment insert failed:', error.message);
    return false;
  }
  return true;
}
