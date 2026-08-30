import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import ProgramForm, { type ProgramFormValues } from './ProgramForm';
import { emptyProgramForm, getProgramMeta, upsertProgramMeta } from '../lib/programMeta';

type Props = { midnight: ReturnType<typeof useMidnight>; id: bigint };

const EditProgram: React.FC<Props> = ({ midnight, id }) => {
  const { bounties, updateBounty, boardReady, persona, error, clearError } = midnight;
  const bounty = bounties.find((b) => b.id === id);
  const [initial, setInitial] = React.useState<ProgramFormValues | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!bounty) return;
    let cancelled = false;
    const base: ProgramFormValues = {
      ...emptyProgramForm,
      amount: '1',
      deadline: bounty.deadline.toString(),
    };
    void getProgramMeta(id).then((meta) => {
      if (cancelled) return;
      setInitial(meta ? { ...base, ...meta } : base);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bounty?.amount.toString(), bounty?.deadline.toString()]);

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

  const submit = async (values: ProgramFormValues) => {
    setBusy(true);
    try {
      const ok = await updateBounty(id, 1n, BigInt(values.deadline || '0'));
      if (!ok) return;
      await upsertProgramMeta(id, values);
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const authorized = persona === 'org' && boardReady;

  return (
    <div style={{ position: 'relative' }}>
      <div className="an-hatch" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!authorized ? (
          <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
            <h1 className="an-hook">EDIT<br />PROGRAM</h1>
            <p className="an-punchline an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
              {persona !== 'org' ? 'LOGIN AS AN ORGANIZATION TO EDIT.' : 'CONNECT YOUR WALLET TO EDIT.'}
            </p>
            <a href={persona !== 'org' ? '#/login-org' : '#/login'} className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>
              {persona !== 'org' ? 'ORG LOGIN' : 'LOGIN & CONNECT'}
            </a>
            {error && <p className="an-dense" style={{ color: 'var(--an-error)', marginTop: 'var(--an-gutter)' }}>{error}</p>}
          </div>
        ) : !initial ? (
          <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
            <p className="an-dense an-secondary-text">LOADING PROGRAM #{id.toString()}…</p>
          </div>
        ) : (
          <ProgramForm
            eyebrow={
              <>
                <span className="an-secondary-text">SYSTEM.MUTATE</span>
                <span className="msx" style={{ fontSize: 14 }}>arrow_forward</span>
                <span style={{ color: '#00ccff' }}>EXISTING_ENTITY</span>
              </>
            }
            title={<>EDIT<br />PROGRAM</>}
            initial={initial}
            submitLabel="EXECUTE SAVE_CHANGES"
            busyLabel="PROVING + SUBMITTING…"
            statusLine={
              <>
                STATUS: <span style={{ color: '#ff9900' }}>AMENDMENT_UNCOMMITTED</span>
                <span className="an-label an-dim" style={{ marginLeft: 12 }}>PROGRAM #{id.toString()}</span>
              </>
            }
            busy={busy}
            error={error}
            onSubmit={submit}
            onCancel={() => navigate('/dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default EditProgram;
