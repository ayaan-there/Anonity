import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';

type Props = { midnight: ReturnType<typeof useMidnight> };

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--an-stack-md)', textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
    {children}
  </div>
);

const CreateProgram: React.FC<Props> = ({ midnight }) => {
  const [amount, setAmount] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { postBounty, boardReady, error, clearError } = midnight;

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 8000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setBusy(true);
    try {
      await postBounty(BigInt(amount), BigInt(deadline || '0'));
      navigateHome();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
      <div className="an-hatch" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="an-hook">CREATE NEW PROGRAM</h1>
        <p className="an-dense an-secondary-text" style={{ margin: 'var(--an-stack-sm) 0 var(--an-stack-lg)' }}>
          POST A BOUNTY ANONYMOUSLY. THE CHAIN STORES A COMMITMENT — NEVER YOUR IDENTITY.
        </p>

        {!boardReady ? (
          <Centered>
            <p className="an-punchline an-secondary-text">LOGIN AS AN ORGANIZATION TO POST.</p>
            <a href="#/login-org" className="an-btn" style={{ width: 'auto' }}>ORG LOGIN</a>
          </Centered>
        ) : (
          <>
            <label className="an-label an-secondary-text an-field-label" htmlFor="amt">AMOUNT (CREDITS)</label>
            <input
              id="amt"
              className="an-input"
              inputMode="numeric"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <div style={{ height: 'var(--an-gutter)' }} />
            <label className="an-label an-secondary-text an-field-label" htmlFor="ddl">DEADLINE (BLOCKS / EPOCH)</label>
            <input
              id="ddl"
              className="an-input"
              inputMode="numeric"
              placeholder="999999"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value.replace(/[^0-9]/g, ''))}
            />

            {error && (
              <p className="an-dense" style={{ color: 'var(--an-error)', marginTop: 'var(--an-gutter)' }}>{error}</p>
            )}

            <button onClick={submit} disabled={busy || !amount} className="an-btn" style={{ marginTop: 'var(--an-stack-md)' }}>
              {busy ? 'PROVING + SUBMITTING…' : 'POST PROGRAM'}
            </button>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
              YOUR WALLET WILL ASK YOU TO APPROVE THE PROOF. NOTHING IDENTIFYING LEAVES YOUR MACHINE.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const navigateHome = () => {
  window.location.hash = '/programs';
};

export default CreateProgram;
