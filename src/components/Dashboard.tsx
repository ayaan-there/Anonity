import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const Dashboard: React.FC<Props> = ({ midnight }) => {
  const { bounties, submissions, boardReady, persona } = midnight;
  const pending = submissions.filter((s) => s.outcome === 0);
  const valid = submissions.filter((s) => s.outcome === 1);
  const dup = submissions.filter((s) => s.outcome === 2);
  const slop = submissions.filter((s) => s.outcome === 3);

  if (persona !== 'org') {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">ORG DASHBOARD</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          LOGIN AS AN ORGANIZATION TO VIEW YOUR DASHBOARD.
        </p>
        <a href="#/login-org" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>ORG LOGIN</a>
      </div>
    );
  }

  const metrics: Array<[string, string, string]> = [
    ['PROGRAMS', bounties.length.toString(), 'var(--an-primary)'],
    ['REPORTS RECEIVED', submissions.length.toString(), 'var(--an-primary)'],
    ['AWAITING REVIEW', pending.length.toString(), 'var(--an-accent)'],
    ['VALID — PAID', valid.length.toString(), 'var(--an-accent)'],
    ['DUPLICATES', dup.length.toString(), 'var(--an-secondary)'],
    ['SLOP — BURNED', slop.length.toString(), 'var(--an-error)'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-lg)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <p className="an-label an-secondary-text" style={{ margin: 0 }}>ORG / COMMAND CENTER</p>
        <h1 className="an-hook">DASHBOARD</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
          HACKER PARTICIPATION · LIVE FROM THE INDEXER
        </p>
      </header>

      <section>
        <div className="an-label an-dim an-brutal-b" style={{ paddingBottom: 'var(--an-unit)', marginBottom: 'var(--an-stack-sm)' }}>
          PARTICIPATION METRICS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: 'var(--an-outline-variant)', padding: 1 }}>
          {metrics.map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--an-surface)', padding: 'var(--an-gutter)' }}>
              <div className="an-label an-dim">{label}</div>
              <div className="an-dense" style={{ fontSize: 28, color, marginTop: 'var(--an-unit)' }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="an-label an-dim an-brutal-b" style={{ paddingBottom: 'var(--an-unit)', marginBottom: 'var(--an-stack-sm)' }}>
          MY PROGRAMS ({bounties.length})
        </div>
        {bounties.length === 0 ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-punchline an-secondary-text">NO PROGRAMS YET.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
              PUBLISH YOUR FIRST PROGRAM TO ATTRACT HACKERS.
            </p>
            <a href="#/create" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-stack-md)' }}>+ PUBLISH A PROGRAM</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {bounties.map((b) => {
              const reports = submissions.filter((s) => s.bountyId === b.id).length;
              const openPending = submissions.some((s) => s.bountyId === b.id && s.outcome === 0);
              return (
                <div key={b.id.toString()} className="an-brutal" style={{ padding: 'var(--an-gutter)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="an-label" style={{ color: 'var(--an-primary)' }}>
                      PROGRAM #{b.id.toString()} · {b.status === 0 ? 'OPEN' : 'CLOSED'}
                    </span>
                    <span className="an-dense an-secondary-text">
                      {b.amount.toString()} CR · DEADLINE {b.deadline.toString()} · {reports} REPORT{reports === 1 ? '' : 'S'}
                    </span>
                    {openPending && <span className="an-label" style={{ color: 'var(--an-accent)' }}>▸ REPORTS AWAITING REVIEW</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--an-unit)' }}>
                    {b.status === 0 && (
                      <button onClick={() => navigate(`/edit/${b.id.toString()}`)} className="an-label" style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--an-outline-variant)', color: 'var(--an-primary)', cursor: 'pointer' }}>
                        EDIT
                      </button>
                    )}
                    <button onClick={() => navigate(`/program/${b.id.toString()}`)} className="an-label" style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--an-outline-variant)', color: 'var(--an-primary)', cursor: 'pointer' }}>
                      OPEN →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="an-label an-dim an-brutal-b" style={{ paddingBottom: 'var(--an-unit)', marginBottom: 'var(--an-stack-sm)' }}>
          REPORTS READY FOR REVIEW ({pending.length})
        </div>
        {pending.length === 0 ? (
          <p className="an-dense an-secondary-text">NOTHING AWAITING REVIEW. CLEAR BOARD.</p>
        ) : (
          <div className="an-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {pending.map((s) => (
              <div key={s.id.toString()} className="an-brutal" style={{ padding: 'var(--an-gutter)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="an-label" style={{ color: 'var(--an-primary)' }}>
                    REPORT #{s.id.toString()} → PROGRAM #{s.bountyId.toString()}
                  </span>
                  <span className="an-dense an-dim">ANONYMOUS SUBMISSION · PENDING TRIAGE</span>
                </div>
                <button onClick={() => navigate(`/program/${s.bountyId.toString()}`)} className="an-btn" style={{ width: 'auto', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, padding: '8px 14px' }}>
                  {boardReady ? 'REVIEW →' : 'CONNECT WALLET TO REVIEW'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;