import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight>; id: bigint };

const EditProgram: React.FC<Props> = ({ midnight, id }) => {
  const { bounties, updateBounty, boardReady, persona, error, clearError } = midnight;
  const bounty = bounties.find((b) => b.id === id);
  const [amount, setAmount] = React.useState(bounty ? bounty.amount.toString() : '');
  const [deadline, setDeadline] = React.useState(bounty ? bounty.deadline.toString() : '');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (bounty) {
      setAmount(bounty.amount.toString());
      setDeadline(bounty.deadline.toString());
    }
  }, [bounty]);

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 8000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  if (!bounty) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">EDIT PROGRAM</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          PROGRAM NOT FOUND. <a href="#/dashboard" className="an-accent-text">BACK TO DASHBOARD</a>
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setBusy(true);
    try {
      await updateBounty(id, BigInt(amount), BigInt(deadline || '0'));
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const authorized = persona === 'org' && boardReady;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
      <div className="an-hatch" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p className="an-label an-secondary-text" style={{ margin: 0 }}>PROGRAM</p>
        <h1 className="an-hook" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>EDIT #{id.toString()}</h1>
        <p className="an-dense an-secondary-text" style={{ margin: 'var(--an-stack-sm) 0 var(--an-stack-lg)' }}>
          ONLY THE POSTING ORG CAN EDIT — PROVEN IN ZK.
        </p>

        {!authorized ? (
          <div style={{ textAlign: 'center' }}>
            <p className="an-punchline an-secondary-text">
              {persona !== 'org' ? 'LOGIN AS AN ORGANIZATION TO EDIT.' : 'CONNECT YOUR WALLET TO EDIT.'}
            </p>
            <a href={persona !== 'org' ? '#/login-org' : '#/login'} className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>
              {persona !== 'org' ? 'ORG LOGIN' : 'LOGIN & CONNECT'}
            </a>
          </div>
        ) : (
          <>
            <label className="an-label an-secondary-text an-field-label" htmlFor="amt">AMOUNT (CREDITS)</label>
            <input id="amt" className="an-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
            <div style={{ height: 'var(--an-gutter)' }} />
            <label className="an-label an-secondary-text an-field-label" htmlFor="ddl">DEADLINE (BLOCKS / EPOCH)</label>
            <input id="ddl" className="an-input" inputMode="numeric" value={deadline} onChange={(e) => setDeadline(e.target.value.replace(/[^0-9]/g, ''))} />

            {error && (
              <p className="an-dense" style={{ color: 'var(--an-error)', marginTop: 'var(--an-gutter)' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 'var(--an-gutter)', marginTop: 'var(--an-stack-md)' }}>
              <button onClick={submit} disabled={busy || !amount} className="an-btn">
                {busy ? 'PROVING + SUBMITTING…' : 'SAVE CHANGES'}
              </button>
              <button onClick={() => navigate('/dashboard')} className="an-btn an-btn--ghost">
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditProgram;