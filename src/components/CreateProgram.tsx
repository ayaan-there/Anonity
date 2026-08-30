import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import ProgramForm, { type ProgramFormValues } from './ProgramForm';
import { emptyProgramForm, upsertProgramMeta } from '../lib/programMeta';

type Props = { midnight: ReturnType<typeof useMidnight> };

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--an-stack-md)', textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
    {children}
  </div>
);

const CreateProgram: React.FC<Props> = ({ midnight }) => {
  const [busy, setBusy] = React.useState(false);
  const { postBounty, boardReady, persona, error, clearError } = midnight;

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 8000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const submit = async (values: ProgramFormValues) => {
    setBusy(true);
    try {
      const bountyId = await postBounty(1n, BigInt(values.deadline || '0'));
      if (bountyId === null) return;
      await upsertProgramMeta(bountyId, values);
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="an-hatch" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {persona !== 'org' ? (
          <Centered>
            <h1 className="an-hook">INITIATE<br />PROGRAM</h1>
            <p className="an-punchline an-secondary-text">SIGN IN AS AN ORGANIZATION TO POST.</p>
            <a href="#/login-org" className="an-btn" style={{ width: 'auto' }}>ORG LOGIN</a>
          </Centered>
        ) : !boardReady ? (
          <Centered>
            <h1 className="an-hook">INITIATE<br />PROGRAM</h1>
            <p className="an-punchline an-secondary-text">CONNECT YOUR WALLET TO POST ON-CHAIN.</p>
            <button onClick={() => midnight.connect()} className="an-btn" style={{ width: 'auto' }}>
              CONNECT WALLET
            </button>
            {error && <p className="an-dense" style={{ color: 'var(--an-error)' }}>{error}</p>}
          </Centered>
        ) : (
          <ProgramForm
            eyebrow={
              <>
                <span className="an-secondary-text">SYSTEM.INITIALIZE</span>
                <span className="msx" style={{ fontSize: 14 }}>arrow_forward</span>
                <span style={{ color: '#00ccff' }}>NEW_ENTITY</span>
              </>
            }
            title={<>INITIATE<br />PROGRAM</>}
            initial={emptyProgramForm}
            submitLabel="EXECUTE PUBLISH_PROGRAM"
            busyLabel="PROVING + SUBMITTING…"
            statusLine={
              <>
                STATUS: <span style={{ color: '#ff9900' }}>DRAFT_UNCOMMITTED</span>
              </>
            }
            busy={busy}
            error={error}
            requirePrizeRanges
            onSubmit={submit}
            onCancel={() => navigate('/dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default CreateProgram;
