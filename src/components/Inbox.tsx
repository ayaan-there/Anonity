import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const Inbox: React.FC<Props> = ({ midnight }) => {
  const { submissions, bounties, persona, boardReady } = midnight;
  const pending = submissions.filter((s) => s.outcome === 0);

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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
        <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
          <h1 className="an-hook">INBOX</h1>
          <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
            REPORTS READY FOR YOUR REVIEW ({pending.length})
          </p>
        </header>

        {pending.length === 0 ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-dense an-secondary-text">ALL CLEAR. NO REPORTS AWAITING TRIAGE.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-unit)' }}>
              REPORTS LAND HERE THE MOMENT A HACKER SUBMITS.
            </p>
          </div>
        ) : (
          <div className="an-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {pending.map((s) => {
              const b = bounties.find((x) => x.id === s.bountyId);
              return (
                <div key={s.id.toString()} className="an-brutal" style={{ padding: 'var(--an-gutter)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-gutter)', background: 'var(--an-surface-lowest)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="an-label" style={{ color: 'var(--an-primary)' }}>
                      REPORT #{s.id.toString()}
                    </span>
                    <span className="an-dense an-secondary-text">
                      PROGRAM #{s.bountyId.toString()}{b ? ` · ${b.amount.toString()} CR BOUNTY` : ''} · ANONYMOUS HUNTER
                    </span>
                  </div>
                  <button onClick={() => navigate(`/program/${s.bountyId.toString()}`)} className="an-btn" style={{ width: 'auto', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, padding: '8px 14px' }}>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <h1 className="an-hook">INBOX</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
          YOUR REPORTS STAY UNLINKED TO YOU — BY DESIGN.
        </p>
      </header>
      <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
        <p className="an-dense an-secondary-text">
          HUNTER ANONYMITY MEANS WE CANNOT SHOW "YOUR" REPORTS — NO SYSTEM CAN, INCLUDING OURS.
        </p>
        <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
          BOARD ACTIVITY: {bounties.length} PROGRAMS · {submissions.length} REPORTS SUBMITTED
        </p>
      </div>
    </div>
  );
};

export default Inbox;