import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';

type Props = { midnight: ReturnType<typeof useMidnight>; bountyId: bigint | null };

const SubmitReport: React.FC<Props> = ({ midnight, bountyId }) => {
  const [selected, setSelected] = React.useState<string>(bountyId ? bountyId.toString() : '');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const { submitReport, boardReady, bounties, error, clearError } = midnight;

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 8000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const openBounties = bounties.filter((b) => b.status === 0);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await submitReport(BigInt(selected));
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
      <div className="an-hatch" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="an-hook">SUBMIT VULNERABILITY REPORT</h1>
        <p className="an-dense an-secondary-text" style={{ margin: 'var(--an-stack-sm) 0 var(--an-stack-lg)' }}>
          NO ACCOUNT. NO NAME. A 5-CREDIT ANTI-SPAM FEE MOVES TO ESCROW — REFUNDED IF YOUR
          REPORT IS VALID OR A DUPLICATE, BURNED ONLY ON SLOP.
        </p>

        {done ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-punchline an-accent-text">REPORT SUBMITTED ANONYMOUSLY.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
              THE CHAIN SAW A PROOF. IT CANNOT LINK THIS REPORT TO YOU OR YOUR WALLET.
            </p>
            <a href="#/programs" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-stack-md)' }}>
              BACK TO PROGRAMS
            </a>
          </div>
        ) : !boardReady ? (
          <div style={{ textAlign: 'center' }}>
            <p className="an-punchline an-secondary-text">CONNECT A WALLET TO SUBMIT.</p>
            <a href="#/access" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>CONNECT WALLET</a>
          </div>
        ) : openBounties.length === 0 ? (
          <p className="an-dense an-secondary-text">NO OPEN PROGRAMS RIGHT NOW. CHECK BACK SOON.</p>
        ) : (
          <>
            <label className="an-label an-secondary-text an-field-label" htmlFor="b">TARGET PROGRAM</label>
            <select id="b" className="an-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select program…</option>
              {openBounties.map((b) => (
                <option key={b.id.toString()} value={b.id.toString()}>
                  PROGRAM #{b.id.toString()} — {b.amount.toString()} CR
                </option>
              ))}
            </select>

            <div className="an-brutal" style={{ padding: 'var(--an-gutter)', marginTop: 'var(--an-stack-md)' }}>
              <span className="an-label an-secondary-text">REPORT CONTENTS</span>
              <p className="an-dense an-dim" style={{ margin: 'var(--an-unit) 0 0' }}>
                Report details travel off-chain through your existing secure channel. The chain
                records only proof-of-submission and your payment rights.
              </p>
            </div>

            {error && (
              <p className="an-dense" style={{ color: 'var(--an-error)', marginTop: 'var(--an-gutter)' }}>{error}</p>
            )}

            <button onClick={submit} disabled={busy || !selected} className="an-btn" style={{ marginTop: 'var(--an-stack-md)' }}>
              {busy ? 'PROVING…' : 'SUBMIT ANONYMOUSLY'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubmitReport;
