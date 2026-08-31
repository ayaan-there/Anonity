import React, { useState } from 'react';
import type { BountyRow, BoardStats, SubmissionRow } from '../hooks/useMidnight';
import { navigate } from '../router';
import { isTransparentDemoMode } from '../lib/deployment-mode';

type BountyBoardProps = {
  network: string;
  contract: string | null;
  bounties: BountyRow[];
  submissions: SubmissionRow[];
  stats: BoardStats | null;
  loading: boolean;
  isConnected: boolean;
  boardReady: boolean;
  postBounty: (amount: bigint, deadline: bigint) => Promise<void>;
  submitReport: (bountyId: bigint) => Promise<void>;
  refreshBoard: () => Promise<void>;
};

const shortHex = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const OUTCOME_LABEL = ['PENDING', 'VALID — PAID', 'DUPLICATE — REFUNDED', 'SLOP — FORFEITED'];

const BountyBoard: React.FC<BountyBoardProps> = ({
  network,
  contract,
  bounties,
  submissions,
  stats,
  loading,
  isConnected,
  boardReady,
  postBounty,
  submitReport,
  refreshBoard,
}) => {
  const [deadline, setDeadline] = useState('999999');
  const [submitBountyId, setSubmitBountyId] = useState('');
  const [resolveId, setResolveId] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const openSubmissions = submissions.filter((s) => s.outcome === 0);

  const run = async (fn: () => Promise<void>, label: string) => {
    setActionMsg(null);
    try {
      await fn();
      setActionMsg(`${label} ✓`);
    } catch {
      setActionMsg(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-container-lowest)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-on-surface)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '8px 10px',
    outline: 'none',
    flexGrow: 1,
    minWidth: 0,
  };

  return (
    <section
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 className="caps" style={{ color: 'var(--color-primary)', margin: 0 }}>
          ANONITY BOUNTY BOARD
        </h3>
        <div className="mono" style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
          {network.toUpperCase()} · {contract ? `${contract.slice(0, 10)}…${contract.slice(-6)}` : 'NOT DEPLOYED'}
          {!boardReady && contract && ' · AWAITING WALLET'}
        </div>
      </div>

      <p className="mono" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: 'var(--color-on-surface-variant)', maxWidth: 780 }}>
        Post a bounty as an organization, report a vulnerability anonymously as a hunter, and resolve
        outcomes with ZK-proven authority. {isTransparentDemoMode ? 'DEMO WARNING: stake and valid-payout funding are transparent.' : 'The chain sees commitments and fee accounting — never a wallet-linked identity.'} Anti-spam fee: 5 NIGHT per report enters contract escrow; resolution records a refund or forfeiture.
      </p>

      {stats && (
        <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
          {[
            ['FEE ESCROWED', stats.feeEscrowed],
            ['FEES FORFEITED', stats.feesBurned],
            ['FEES REFUNDED', stats.feesRefunded],
            ['TOTAL PAYOUTS RECORDED', stats.totalPaid],
          ].map(([label, value]) => (
            <div
              key={label as string}
              style={{ background: 'var(--color-surface)', padding: '10px 16px', minWidth: 130, flexGrow: 1 }}
            >
              <div className="caps-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{label as string}</div>
              <div className="mono" style={{ fontSize: 18, color: 'var(--color-primary)', marginTop: 2 }}>
                {(value as bigint).toString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isConnected || !boardReady ? (
        <div
          className="mono"
          style={{
            border: '1px solid var(--color-border)',
            padding: '14px',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-on-surface-variant)',
          }}
        >
          {contract
            ? 'CONNECT YOUR WALLET ABOVE TO USE THE BOUNTY BOARD.'
            : 'BOUNTY CONTRACT NOT DEPLOYED YET — SET VITE_ANONITY_CONTRACT AFTER PREPROD DEPLOY.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <fieldset disabled={loading} style={{ flex: '1 1 300px', border: '1px solid var(--color-border)', padding: 14, margin: 0 }}>
              <legend className="caps-xs" style={{ color: 'var(--color-secondary)', padding: '0 6px' }}>POST BOUNTY (ORG)</legend>
              <div style={{ display: 'flex', gap: 8 }}>
                <input aria-label="Deadline" style={inputStyle} value={deadline} onChange={(e) => setDeadline(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Deadline" />
                <button className="btn-secondary" onClick={() => run(() => postBounty(1n, BigInt(deadline || '0')), 'BOUNTY POSTED')} disabled={loading}>
                  POST
                </button>
              </div>
            </fieldset>

            <fieldset disabled={loading} style={{ flex: '1 1 280px', border: '1px solid var(--color-border)', padding: 14, margin: 0 }}>
              <legend className="caps-xs" style={{ color: 'var(--color-secondary)', padding: '0 6px' }}>SUBMIT REPORT (HUNTER)</legend>
              <div style={{ display: 'flex', gap: 8 }}>
                <select aria-label="Bounty" style={inputStyle} value={submitBountyId} onChange={(e) => setSubmitBountyId(e.target.value)}>
                  <option value="">Select bounty…</option>
                  {bounties.filter((b) => b.status === 0).map((b) => (
                    <option key={b.id.toString()} value={b.id.toString()}>
                      PROGRAM #{b.id.toString()}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => run(() => submitReport(BigInt(submitBountyId)), 'REPORT SUBMITTED')}
                  disabled={loading || !submitBountyId}
                >
                  SUBMIT
                </button>
              </div>
            </fieldset>

            <fieldset disabled={loading} style={{ flex: '1 1 320px', border: '1px solid var(--color-border)', padding: 14, margin: 0 }}>
              <legend className="caps-xs" style={{ color: 'var(--color-secondary)', padding: '0 6px' }}>RESOLVE (ORG-ONLY)</legend>
              <div style={{ display: 'flex', gap: 8 }}>
                <select aria-label="Submission" style={inputStyle} value={resolveId} onChange={(e) => setResolveId(e.target.value)}>
                  <option value="">Submission…</option>
                  {openSubmissions.map((s) => (
                    <option key={s.id.toString()} value={s.id.toString()}>#{s.id.toString()} → bounty #{s.bountyId.toString()}</option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => { if (resolveId) navigate(`/inbox/${resolveId}`); }}
                  disabled={loading || !resolveId}
                >
                  OPEN INBOX TRIAGE
                </button>
              </div>
            </fieldset>
          </div>

          {actionMsg && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--color-primary)' }}>{actionMsg}</div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-on-surface-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>#</th>
                  <th style={{ padding: '8px 10px' }}>DEADLINE</th>
                  <th style={{ padding: '8px 10px' }}>ORG COMMITMENT</th>
                  <th style={{ padding: '8px 10px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {bounties.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>No bounties yet — post the first one.</td></tr>
                )}
                {bounties.map((b) => (
                  <tr key={b.id.toString()} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--color-secondary)' }}>{b.id.toString()}</td>
                    <td style={{ padding: '8px 10px' }}>{b.deadline.toString()}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-on-surface-variant)' }}>{shortHex(b.org)}…</td>
                    <td style={{ padding: '8px 10px', color: b.status === 0 ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                      {b.status === 0 ? 'OPEN' : 'CLOSED'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-on-surface-variant)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>SUB #</th>
                  <th style={{ padding: '8px 10px' }}>BOUNTY</th>
                  <th style={{ padding: '8px 10px' }}>HUNTER COMMITMENT</th>
                  <th style={{ padding: '8px 10px' }}>OUTCOME</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '12px 10px', color: 'var(--color-on-surface-variant)' }}>No reports submitted yet.</td></tr>
                )}
                {submissions.map((s) => (
                  <tr key={s.id.toString()} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--color-secondary)' }}>{s.id.toString()}</td>
                    <td style={{ padding: '8px 10px' }}>#{s.bountyId.toString()}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-on-surface-variant)' }}>{shortHex(s.hunter)}…</td>
                    <td style={{ padding: '8px 10px' }}>{OUTCOME_LABEL[s.outcome] ?? `UNKNOWN (${s.outcome})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => run(refreshBoard, 'REFRESHED')} disabled={loading}>
            REFRESH BOARD
          </button>
        </>
      )}
    </section>
  );
};

export default BountyBoard;
