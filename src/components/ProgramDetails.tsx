import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight>; id: bigint };

const shortHex = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const OUTCOME_LABEL = ['PENDING', 'VALID — PAID', 'DUPLICATE — REFUNDED', 'SLOP — BURNED'];

const ProgramDetails: React.FC<Props> = ({ midnight, id }) => {
  const { bounties, submissions, boardReady, resolveSubmission } = midnight;
  const bounty = bounties.find((b) => b.id === id);
  const subs = submissions.filter((s) => s.bountyId === id);
  const [busy, setBusy] = React.useState(false);

  if (!bounty) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">PROGRAM #{id.toString()}</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          NOT FOUND OR STILL SYNCING. <a href="#/programs" className="an-accent-text">BACK TO PROGRAMS</a>
        </p>
      </div>
    );
  }

  const resolve = async (sid: bigint, outcome: number) => {
    setBusy(true);
    try {
      await resolveSubmission(sid, outcome);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <p className="an-label an-secondary-text" style={{ margin: 0 }}>PROGRAM</p>
        <h1 className="an-hook" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>#{id.toString()}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)', marginTop: 'var(--an-gutter)' }}>
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">AMOUNT</span>
            <span className="an-chip__val an-accent-text an-dense" style={{ fontWeight: 600 }}>{bounty.amount.toString()} CR</span>
          </span>
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">DEADLINE</span>
            <span className="an-chip__val an-dense">{bounty.deadline.toString()}</span>
          </span>
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">STATUS</span>
            <span className="an-chip__val an-dense">{bounty.status === 0 ? 'OPEN' : 'CLOSED'}</span>
          </span>
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">ORG</span>
            <span className="an-chip__val an-dense">0x{shortHex(bounty.org)}…</span>
          </span>
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--an-gutter)' }}>
          <h2 className="an-punchline">SUBMISSIONS ({subs.length})</h2>
          {bounty.status === 0 && (midnight.persona === 'hunter' ? (
            <a
              href={`#/submit/${id.toString()}`}
              className="an-btn"
              style={{ width: 'auto', textDecoration: 'none', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            >
              SUBMIT A REPORT
            </a>
          ) : midnight.persona === null ? (
            <a
              href="#/login"
              className="an-label an-dim"
              style={{ textDecoration: 'none' }}
            >
              LOGIN AS HACKER TO SUBMIT →
            </a>
          ) : null)}
        </div>

        {subs.length === 0 ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-dense an-secondary-text">NO REPORTS YET.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-unit)' }}>
              HUNTERS ARE WATCHING. FIRST BLOOD GETS PAID.
            </p>
          </div>
        ) : (
          <div className="an-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {subs.map((s) => (
              <div key={s.id.toString()} className="an-brutal" style={{ padding: 'var(--an-gutter)', display: 'flex', flexDirection: 'column', gap: 'var(--an-unit)', background: 'var(--an-surface-lowest)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-unit)' }}>
                  <span className="an-label" style={{ color: s.outcome === 1 ? 'var(--an-accent)' : s.outcome === 3 ? 'var(--an-error)' : 'var(--an-primary)' }}>
                    SUB #{s.id.toString()} · {OUTCOME_LABEL[s.outcome] ?? `UNKNOWN (${s.outcome})`}
                  </span>
                  <span className="an-dense an-dim">0x{shortHex(s.hunter)}…</span>
                </div>
                {s.outcome === 0 && boardReady && (
                  <div style={{ display: 'flex', gap: 'var(--an-unit)', marginTop: 'var(--an-unit)' }}>
                    {[['VALID', 1], ['DUPLICATE', 2], ['SLOP', 3]].map(([label, oc]) => (
                      <button
                        key={label as string}
                        disabled={busy}
                        onClick={() => resolve(s.id, oc as number)}
                        className="an-label"
                        style={{
                          padding: '8px 12px',
                          background: 'transparent',
                          border: '1px solid var(--an-outline-variant)',
                          color: 'var(--an-primary)',
                          cursor: busy ? 'wait' : 'pointer',
                          transition: 'background-color var(--an-fast) ease, color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--an-primary)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--an-outline-variant)')}
                      >
                        RESOLVE {label as string}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!boardReady && subs.some((s) => s.outcome === 0) && (
          <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
            CONNECT THE ORG WALLET TO RESOLVE PENDING REPORTS.
          </p>
        )}
      </section>

      <button onClick={() => navigate('/programs')} className="an-btn an-btn--ghost" style={{ width: 'auto', alignSelf: 'flex-start' }}>
        ← ALL PROGRAMS
      </button>
    </div>
  );
};

export default ProgramDetails;
