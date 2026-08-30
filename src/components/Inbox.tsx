import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import { listOwnedProgramIds } from '../lib/programMeta';
import { listReportComments, listReportsForCurrentHunter, type ReportComment, type ReportContent } from '../lib/reports';
import { formatNightFromAtomic } from '../lib/night';
import SubmissionDetails from './SubmissionDetails';

type Props = { midnight: ReturnType<typeof useMidnight>; submissionId?: bigint };

const Inbox: React.FC<Props> = ({ midnight, submissionId }) => {
  const { submissions, persona, boardReady } = midnight;
  const [ownedProgramIds, setOwnedProgramIds] = React.useState<Set<bigint> | null>(null);
  const [reports, setReports] = React.useState<ReportContent[]>([]);
  const [comments, setComments] = React.useState<Map<number, ReportComment[]>>(new Map());
  const [selectedReportId, setSelectedReportId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (persona !== 'org') return () => { cancelled = true; };
    void listOwnedProgramIds().then((ids) => {
      if (!cancelled) setOwnedProgramIds(ids);
    });
    return () => { cancelled = true; };
  }, [persona]);

  React.useEffect(() => {
    let cancelled = false;
    if (persona !== 'hunter') return () => { cancelled = true; };
    void listReportsForCurrentHunter().then(async (rows) => {
      if (cancelled) return;
      setReports(rows);
      setSelectedReportId((current) => current ?? rows[0]?.submissionId ?? null);
      const entries = await Promise.all(rows.map(async (report) => [report.submissionId, await listReportComments(BigInt(report.submissionId))] as const));
      if (!cancelled) setComments(new Map(entries));
    });
    return () => { cancelled = true; };
  }, [persona]);

  const pending = ownedProgramIds
    ? submissions.filter((s) => s.outcome === 0 && ownedProgramIds.has(s.bountyId))
    : [];

  if (!persona) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">INBOX</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          LOG IN TO VIEW YOUR ACTIVITY.
        </p>
        <a href="#/login" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>LOGIN</a>
      </div>
    );
  }

  if (persona === 'org') {
    if (submissionId !== undefined) {
      return <SubmissionDetails midnight={midnight} id={submissionId} />;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
        <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
          <h1 className="an-hook">INBOX</h1>
          <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
            REPORTS READY FOR YOUR REVIEW ({pending.length})
          </p>
        </header>

        {ownedProgramIds === null ? (
          <p className="an-dense an-secondary-text">LOADING YOUR TRIAGE QUEUE…</p>
        ) : pending.length === 0 ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-dense an-secondary-text">ALL CLEAR. NO REPORTS AWAITING TRIAGE.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-unit)' }}>
              REPORTS LAND HERE THE MOMENT A HACKER SUBMITS.
            </p>
          </div>
        ) : (
          <div className="an-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {pending.map((s) => {
              return (
                <div key={s.id.toString()} className="an-brutal" style={{ padding: 'var(--an-gutter)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="an-label" style={{ color: 'var(--an-primary)' }}>
                      REPORT #{s.id.toString()}
                    </span>
                    <span className="an-dense an-secondary-text">
                      PROGRAM #{s.bountyId.toString()} · ANONYMOUS HUNTER
                    </span>
                  </div>
                  <button onClick={() => navigate(`/inbox/${s.id.toString()}`)} className="an-btn" style={{ width: 'auto', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, padding: '8px 14px' }}>
                    {boardReady ? 'TRIAGE →' : 'CONNECT WALLET TO TRIAGE'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // hunter persona
  const selectedReport = reports.find((report) => report.submissionId === selectedReportId) ?? reports[0];
  return (
    <div className="inbox-shell">
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <h1 className="an-hook">INBOX</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
          YOUR REPORTS STAY UNLINKED TO YOU — BY DESIGN.
        </p>
      </header>
      {reports.length === 0 ? (
        <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
          <p className="an-dense an-secondary-text">NO REPORTS SUBMITTED YET.</p>
          <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>YOUR REPORTS AND TRIAGE MESSAGES WILL APPEAR HERE.</p>
        </div>
      ) : (
        <div className="inbox-layout">
          <div className="inbox-list an-brutal">
          {reports.map((report) => (
            <button key={report.submissionId} className={`inbox-list-item${selectedReport?.submissionId === report.submissionId ? ' inbox-list-item--active' : ''}`} onClick={() => setSelectedReportId(report.submissionId)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--an-gutter)', flexWrap: 'wrap' }}>
                <span className="an-label" style={{ color: 'var(--an-primary)' }}>REPORT #{report.submissionId}</span>
                <span className="an-label an-dim">{report.severity || 'SEVERITY NOT SET'}</span>
              </div>
              <p className="an-dense" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 'var(--an-unit) 0 0', textAlign: 'left' }}>{report.description}</p>
            </button>
          ))}
          </div>
          {selectedReport && (
            <section className="inbox-detail an-brutal">
              <div className="inbox-detail__meta">
                <span className="an-label an-secondary-text">REPORT #{selectedReport.submissionId} · PRIVATE</span>
                <span className="an-label an-dim">{selectedReport.severity || 'SEVERITY NOT SET'}</span>
              </div>
              <h2 className="an-punchline">{selectedReport.weakness || 'REPORT DETAILS'}</h2>
              <div className="inbox-detail__tabs an-label"><span className="inbox-detail__tab">REPORT</span><span>TIMELINE</span></div>
              <div className="inbox-detail__body">
                <span className="an-label an-secondary-text">DESCRIPTION</span>
                <p className="an-dense" style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.description}</p>
                {selectedReport.impact && <><span className="an-label an-secondary-text">IMPACT</span><p className="an-dense" style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.impact}</p></>}
              </div>
              {selectedReport.paymentStatus === 'paid' ? (
                <p className="an-label an-accent-text">VALID REPORT · {formatNightFromAtomic(selectedReport.paidAmount)} NIGHT PAID TO YOUR WALLET</p>
              ) : selectedReport.payoutAddress ? (
                <p className="an-label an-dim">PAYOUT ADDRESS ON FILE · AWAITING ORG PAYMENT</p>
              ) : <p className="an-label an-dim">ADD A PAYOUT WALLET ADDRESS TO RECEIVE NIGHT</p>}
              <div className="inbox-thread">
                <span className="an-label an-secondary-text">TRIAGE THREAD</span>
                {(comments.get(selectedReport.submissionId) ?? []).length === 0 ? <span className="an-label an-dim">NO MESSAGES YET.</span> : (comments.get(selectedReport.submissionId) ?? []).map((comment) => <p key={comment.id} className="an-dense">{comment.body}</p>)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Inbox;
