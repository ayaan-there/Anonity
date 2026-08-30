import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import { getReport, insertReportComment, listReportComments, markReportPaid, type ReportComment, type ReportContent } from '../lib/reports';
import { isProgramOwner } from '../lib/programMeta';
import { formatNightFromAtomic, parseNightToAtomic } from '../lib/night';

type Props = { midnight: ReturnType<typeof useMidnight>; id: bigint };

const OUTCOME_LABEL = ['PENDING', 'VALID — PAID', 'DUPLICATE — REFUNDED', 'SLOP — FORFEITED'];

const SubmissionDetails: React.FC<Props> = ({ midnight, id }) => {
  const { bounties, submissions, boardReady, persona, resolveSubmission, payHacker } = midnight;
  const submission = submissions.find((s) => s.id === id);
  const submissionBountyId = submission?.bountyId;
  const bounty = submission ? bounties.find((b) => b.id === submission.bountyId) : undefined;
  const [isOwner, setIsOwner] = React.useState(false);
  const [report, setReport] = React.useState<ReportContent | null>(null);
  const [comments, setComments] = React.useState<ReportComment[]>([]);
  const [commentText, setCommentText] = React.useState('');
  const [commentBusy, setCommentBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [payBusy, setPayBusy] = React.useState(false);
  const [payNotice, setPayNotice] = React.useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setIsOwner(false);
    if (persona !== 'org' || submissionBountyId === undefined) return () => { cancelled = true; };
    void isProgramOwner(submissionBountyId).then((owned) => {
      if (!cancelled) setIsOwner(owned);
    });
    return () => { cancelled = true; };
  }, [persona, submissionBountyId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!isOwner) {
      setReport(null);
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    void getReport(id).then((result) => {
      if (!cancelled) {
        setReport(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, isOwner]);

  React.useEffect(() => {
    let cancelled = false;
    if (!isOwner) return () => { cancelled = true; };
    void listReportComments(id).then((rows) => {
      if (!cancelled) setComments(rows);
    });
    return () => { cancelled = true; };
  }, [id, isOwner]);

  if (persona !== 'org') {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">SUBMISSION #{id.toString()}</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          LOGIN AS AN ORGANIZATION TO REVIEW SUBMISSIONS.
        </p>
        <a href="#/login-org" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>ORG LOGIN</a>
      </div>
    );
  }

  if (!submission || !bounty || !isOwner) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">SUBMISSION #{id.toString()}</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          SUBMISSION NOT FOUND OR NOT AVAILABLE TO THIS ORGANIZATION. <a href="#/dashboard" className="an-accent-text">BACK TO DASHBOARD</a>
        </p>
      </div>
    );
  }

  const resolve = async (outcome: number) => {
    setBusy(true);
    try {
      await resolveSubmission(id, outcome);
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!report?.payoutAddress || report.paymentStatus === 'paid' || payBusy) return;
    const atomicAmount = parseNightToAtomic(payoutAmount);
    if (atomicAmount === null || atomicAmount <= 0n) {
      setPayNotice('ENTER A VALID NIGHT AMOUNT, FOR EXAMPLE 0.0012.');
      return;
    }
    setPayBusy(true);
    setPayNotice(null);
    const reference = await payHacker(report.payoutAddress, atomicAmount);
    if (reference) {
      const saved = await markReportPaid(id, atomicAmount, report.payoutAddress, reference);
      if (saved) {
        setReport({ ...report, paymentStatus: 'paid', paymentTxId: reference, paidAmount: Number(atomicAmount), paidAt: new Date().toISOString() });
        setPayNotice(`PAID ${formatNightFromAtomic(atomicAmount)} NIGHT TO THE HUNTER.`);
        navigate('/dashboard');
      } else {
        setPayNotice('WALLET TRANSFER SENT, BUT PAYMENT STATUS COULD NOT BE SAVED. VERIFY THE WALLET HISTORY.');
      }
    }
    setPayBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <p className="an-label an-secondary-text" style={{ margin: 0 }}>SUBMISSION #{id.toString()}</p>
        <h1 className="an-hook">REPORT REVIEW</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
          PROGRAM #{bounty.id.toString()} · {OUTCOME_LABEL[submission.outcome] ?? 'UNKNOWN'}
        </p>
      </header>

      {loading ? (
        <p className="an-dense an-secondary-text">LOADING REPORT CONTENT…</p>
      ) : report ? (
        <section className="an-brutal" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)', padding: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)' }}>
            <span className="an-chip"><span className="an-label an-chip__key an-secondary-text">ASSET</span><span className="an-chip__val an-dense">{report.asset || '—'}</span></span>
            <span className="an-chip"><span className="an-label an-chip__key an-secondary-text">WEAKNESS</span><span className="an-chip__val an-dense">{report.weakness || '—'}</span></span>
            <span className="an-chip"><span className="an-label an-chip__key an-secondary-text">SEVERITY</span><span className="an-chip__val an-dense">{report.severity || 'NOT SET'}</span></span>
          </div>
          <div>
            <div className="an-label an-secondary-text" style={{ marginBottom: 'var(--an-unit)' }}>DESCRIPTION</div>
            <pre className="an-dense" style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 'var(--an-gutter)', background: 'var(--an-bg)', border: '1px solid var(--an-outline-variant)' }}>{report.description}</pre>
          </div>
          {report.impact && (
            <div>
              <div className="an-label an-secondary-text" style={{ marginBottom: 'var(--an-unit)' }}>IMPACT</div>
              <pre className="an-dense" style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 'var(--an-gutter)', background: 'var(--an-bg)', border: '1px solid var(--an-outline-variant)' }}>{report.impact}</pre>
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--an-outline-variant)', paddingTop: 'var(--an-stack-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="an-label an-secondary-text">PAYOUT</span>
            {report.payoutAddress ? (
              <>
                <span className="an-dense" style={{ overflowWrap: 'anywhere' }}>{report.payoutAddress}</span>
                {submission.outcome === 1 && report.paymentStatus !== 'paid' && (
                  <>
                    <label className="an-label an-secondary-text" htmlFor="payout-amount">PAYOUT AMOUNT (NIGHT)</label>
                    <input id="payout-amount" className="an-input" inputMode="decimal" placeholder="e.g. 0.0012" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} style={{ maxWidth: 240 }} />
                    <button type="button" className="an-btn" onClick={() => void pay()} disabled={payBusy} style={{ width: 'auto', alignSelf: 'flex-start', marginTop: 4 }}>
                      {payBusy ? 'AWAITING WALLET…' : 'PAY NIGHT'}
                    </button>
                  </>
                )}
                {report.paymentStatus === 'paid' && <span className="an-label an-accent-text">PAYMENT SENT · {formatNightFromAtomic(report.paidAmount)} NIGHT</span>}
              </>
            ) : <span className="an-label an-dim">NO PAYOUT ADDRESS PROVIDED.</span>}
            {payNotice && <span className="an-label" style={{ color: payNotice.startsWith('PAID') ? 'var(--an-accent)' : 'var(--an-error)' }}>{payNotice}</span>}
          </div>
        </section>
      ) : (
        <section className="an-brutal" style={{ padding: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
          <p className="an-dense an-secondary-text" style={{ margin: 0 }}>LEGACY SUBMISSION — CONTENT NOT ATTACHED.</p>
        </section>
      )}

      {isOwner && report && (
        <section className="an-section">
          <div className="an-section__tab">TRIAGE THREAD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-unit)', marginTop: 'var(--an-stack-sm)' }}>
            {comments.length === 0 ? (
              <p className="an-label an-dim" style={{ margin: 0 }}>NO MESSAGES YET.</p>
            ) : comments.map((comment) => (
              <p key={comment.id} className="an-dense" style={{ margin: 0, padding: '8px', background: 'var(--an-surface-lowest)', border: '1px solid var(--an-outline-variant)', whiteSpace: 'pre-wrap' }}>{comment.body}</p>
            ))}
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!commentText.trim() || commentBusy) return;
                setCommentBusy(true);
                const ok = await insertReportComment(id, commentText);
                if (ok) {
                  setCommentText('');
                  setComments(await listReportComments(id));
                }
                setCommentBusy(false);
              }}
              style={{ display: 'flex', gap: 'var(--an-unit)', flexWrap: 'wrap', marginTop: 'var(--an-unit)' }}
            >
              <textarea className="an-input" rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a triage message to the hacker…" aria-label="Triage message" style={{ flex: '1 1 280px' }} />
              <button type="submit" className="an-btn" disabled={commentBusy || !commentText.trim()} style={{ width: 'auto', alignSelf: 'flex-end' }}>
                {commentBusy ? 'SENDING…' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>
        </section>
      )}

      {submission.outcome === 0 && !boardReady && (
        <p className="an-label an-dim">CONNECT WALLET TO RESOLVE THIS REPORT.</p>
      )}
      {submission.outcome === 0 && boardReady && (
        <div style={{ display: 'flex', gap: 'var(--an-unit)', flexWrap: 'wrap' }}>
          {[['VALID', 1], ['DUPLICATE', 2], ['SLOP', 3]].map(([label, outcome]) => (
            <button key={label as string} disabled={busy} onClick={() => void resolve(outcome as number)} className="an-label" style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--an-outline-variant)', color: 'var(--an-primary)', cursor: busy ? 'wait' : 'pointer' }}>
              RESOLVE {label as string}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/inbox')} className="an-btn an-btn--ghost" style={{ width: 'auto', alignSelf: 'flex-start' }}>
        ← INBOX
      </button>
    </div>
  );
};

export default SubmissionDetails;
