import React from 'react';
import TrueFocus from './TrueFocus';
import DotField from './DotField';

const truncateHex = (s: string, head = 12, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

const Row: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <div style={{ marginBottom: 16 }}>
    <label className="caps-sm" style={{ color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
      {label}
    </label>
    <div
      className={mono ? 'mono code' : 'mono'}
      style={{ color: 'var(--color-primary)', fontSize: 13 }}
    >
      {value}
    </div>
  </div>
);

interface CircuitCallProps {
  network: string;
  contract: string | null;
  count: bigint | null;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  refreshCount: () => void;
  loading: boolean;
  result: string | null;
  lastCircuit: string | null;
  lastTxId: string | null;
  lastBlock: string | null;
  error: string | null;
  isConnected: boolean;
  noWallet: boolean;
}

const CircuitCall: React.FC<CircuitCallProps> = ({
  network,
  contract,
  count,
  increment,
  decrement,
  reset,
  refreshCount,
  loading,
  result,
  lastCircuit,
  lastTxId,
  lastBlock,
  error,
  isConnected,
  noWallet,
}) => {
  const privateUnlocked = isConnected;
  const proofInProgress = loading && isConnected;

  const resultStatus = !isConnected
    ? 'NOT VERIFIED'
    : proofInProgress
      ? 'PROVING…'
      : result
        ? 'VERIFIED'
        : 'READY';

  const resultColor = isConnected ? '#00d97e' : 'var(--color-secondary)';

  const greenGlow = {
    color: '#00d97e',
    textShadow: '0 0 8px rgba(0, 217, 126, 0.55)',
  };

  return (
    <section
      style={{
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <section
        style={{
          padding: '40px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}
        className="hero-pad"
      >
        <div style={{ marginBottom: 16 }}>
          <TrueFocus
            sentence="PROVE WITHOUT | REVEALING"
            blurAmount={5}
            borderColor="#00d97e"
            glowColor="rgba(0, 217, 126, 0.55)"
            animationDuration={0.55}
            pauseBetweenGroups={3.2}
            emphasisPause={0.9}
          />
        </div>
        <p
          style={{
            color: 'var(--color-on-surface-variant)',
            maxWidth: 540,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Prove a property of private input without exposing the input itself.
          ANONITY wraps a Midnight counter contract into a privacy-first
          verification surface — ownership of a secret is proven via a
          zero-knowledge witness, never disclosed on-chain.
        </p>
      </section>

      <section
        style={{
          padding: '40px 20px',
          flexGrow: 1,
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
        }}
        className="hero-pad"
      >
        <DotField
          dotRadius={4}
          dotSpacing={11}
          bulgeStrength={36}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
        />
        <div
          style={{
            width: '100%',
            maxWidth: '60rem',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <p
              className="code"
              style={{
                margin: 0,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: 13,
              }}
            >
              CLAIM: A KNOWLEDGE OF THE COUNTER'S OWNER SECRET SATISFIES THE VERIFICATION CONDITION.
            </p>
          </div>

          <div
            style={{
              borderBottom: '1px solid var(--color-border)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-surface)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span className="caps" style={{ color: 'var(--color-primary)' }}>
              PRIVACY VERIFICATION
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr)',
              gap: 1,
              background: 'var(--color-border)',
              position: 'relative',
              zIndex: 1,
            }}
            className="priv-grid"
          >
            <div style={{ background: 'var(--color-bg)', padding: 24 }}>
              <h3
                className="caps"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 16px',
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                PUBLIC DATA
              </h3>
              <Row label="NETWORK" value={`MIDNIGHT ${network.toUpperCase()}`} />
              <Row
                label="CONTRACT"
                value={contract ? truncateHex(contract, 12, 6) : 'NOT CONFIGURED'}
                mono
              />
              <Row
                label="COUNTER"
                value={count == null ? '—' : count.toString()}
                mono
              />
              <Row
                label="RESULT"
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: resultColor, textShadow: resultColor === '#00d97e' ? '0 0 8px rgba(0, 217, 126, 0.55)' : undefined }}>
                    {result && !loading ? '✓' : proofInProgress ? <span className="spinner" /> : '•'} {resultStatus}
                  </span>
                }
                mono
              />
            </div>

            <div
              style={{
                background: 'var(--color-bg)',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.015) 3px 4px)',
                  opacity: privateUnlocked ? 0.1 : 0.04,
                  transition: 'opacity 320ms var(--ease-out)',
                }}
              />
              <h3
                className="caps"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 16px',
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                PRIVATE DATA
                <span
                  style={{
                    fontSize: 12,
                    opacity: privateUnlocked ? 0.7 : 0.3,
                    transition: 'opacity 220ms var(--ease-out)',
                  }}
                >
                  {privateUnlocked ? '◆' : '◇'}
                </span>
              </h3>
              <Row
                label="PRIVATE WITNESS"
                value={
                  privateUnlocked ? (
                    <span className="redacted-bar revealed mono" style={{ fontSize: 13 }}>
                      ████████████████
                    </span>
                  ) : (
                    <span className="redacted-bar mono" style={{ fontSize: 13 }}>
                      ████████████████
                    </span>
                  )
                }
              />
              <Row label="SECRET KEY" value={privateUnlocked ? 'HELD IN LOCAL STATE' : 'NOT DISPLAYED'} />
              <Row
                label="DISCLOSURE"
                value={privateUnlocked ? 'NONE — ZK PROOF ONLY' : 'NONE'}
              />
              {isConnected ? (
                <div
                  className="fade-in"
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-on-surface-variant)',
                    lineHeight: 1.55,
                  }}
                >
                  WITNESS UNLOCKED · PROOF SIGNATURE KEPT IN WALLET.
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--color-on-tertiary-fixed-variant)',
                    lineHeight: 1.55,
                  }}
                >
                  WAITING FOR WALLET CONNECTION TO UNLOCK WITNESS.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: 20,
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
              background: 'var(--color-bg)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {!isConnected ? (
              <div
                className="caps"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  padding: '8px 0',
                }}
              >
                CONNECT YOUR WALLET ABOVE TO UNLOCK THE CIRCUIT
              </div>
            ) : (
              <>
                <button className="btn-prove" onClick={increment} disabled={loading || !contract}>
                  {loading ? <><span className="spinner" style={{ marginRight: 8 }} />PROVING</> : 'PROVE PRIVATELY · +1'}
                </button>
                <button className="btn-ghost" onClick={decrement} disabled={loading || !contract}>
                  −1
                </button>
                <button className="btn-ghost" onClick={reset} disabled={loading || !contract}>
                  RESET
                </button>
                <button className="btn-ghost" onClick={refreshCount} disabled={loading}>
                  ↻ READ
                </button>
              </>
            )}
          </div>

          {result && !loading && (
            <div
              className="fade-in caps"
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                textAlign: 'center',
                color: '#00d97e',
                fontSize: 12,
                letterSpacing: '0.08em',
                position: 'relative',
                zIndex: 1,
              }}
            >
              ✓ PROVED WITHOUT REVEALING YOUR INPUT
            </div>
          )}
        </div>

        {lastCircuit && (
          <div
            className="fade-in flow-wrap"
            style={{
              marginTop: 32,
              width: '100%',
              maxWidth: '60rem',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              padding: '12px 16px',
              gap: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="caps" style={result ? greenGlow : { color: 'var(--color-on-surface-variant)' }}>
                CIRCUIT
              </span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--color-on-surface)' }}>
                {lastCircuit}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="caps" style={{ color: 'var(--color-on-surface-variant)' }}>
                TX
              </span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--color-on-surface)' }}>
                {lastTxId ? truncateHex(lastTxId, 14, 6) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="caps" style={{ color: 'var(--color-on-surface-variant)' }}>
                BLOCK
              </span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--color-on-surface)' }}>
                {lastBlock ?? '—'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="fade-in"
            style={{
              marginTop: 24,
              width: '100%',
              maxWidth: '60rem',
              padding: '12px 16px',
              background: 'var(--color-error-container)',
              color: 'var(--color-on-error-container)',
              border: '1px solid var(--color-error-container)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.55,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span className="caps-xs" style={{ marginRight: 8, color: 'var(--color-on-error-container)' }}>
              ERROR
            </span>
            {error}
          </div>
        )}

        {!contract && isConnected && (
          <div
            className="fade-in"
            style={{
              marginTop: 24,
              width: '100%',
              maxWidth: '60rem',
              padding: '12px 16px',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface-variant)',
              border: '1px dashed var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span className="caps-xs" style={{ marginRight: 8 }}>
              CONFIG
            </span>
            Set <code>VITE_DEFAULT_CONTRACT</code> to the counter deployment address before proving.
          </div>
        )}

        {noWallet && (
          <div
            className="fade-in"
            style={{
              marginTop: 24,
              width: '100%',
              maxWidth: '60rem',
              padding: '12px 16px',
              background: 'var(--color-surface)',
              color: 'var(--color-on-surface-variant)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span className="caps-xs" style={{ marginRight: 8 }}>
              WALLET
            </span>
            No Midnight wallet detected. Install{' '}
            <a
              className="link-style"
              href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk"
              target="_blank"
              rel="noreferrer"
            >
              Lace
            </a>{' '}
            and reload.
          </div>
        )}
      </section>
    </section>
  );
};

export default CircuitCall;
