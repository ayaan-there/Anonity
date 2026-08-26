import React, { useEffect } from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const SecureAccess: React.FC<Props> = ({ midnight }) => {
  const { walletState, availableWallets, connect, error } = midnight;
  const isConnected = walletState === 'connected';
  const connecting = walletState === 'connecting';

  useEffect(() => {
    if (isConnected) navigate('/programs');
  }, [isConnected]);

  const enterAs = (persona: 'org' | 'hunter') => {
    midnight.setPersona(persona);
    void connect();
  };

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: 'var(--an-stack-lg) 0' }}>
      <div className="an-hatch" />
      <div
        className="an-brutal"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 640,
          background: 'var(--an-surface)',
          padding: 'var(--an-stack-lg) var(--an-stack-md) var(--an-stack-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--an-stack-sm)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 className="an-hook">prove without revealing</h1>
          <p
            className="an-label an-secondary-text an-brutal-t"
            style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-unit)' }}
          >
            BUILD A REPUTATION. NOT AN EXPOSURE TRAIL.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', marginTop: 'var(--an-stack-sm)' }}>
          <span className="an-label an-dim">&gt;_ CHOOSE YOUR SIDE</span>

          {walletState === 'no-wallet' && (
            <p className="an-dense" style={{ color: 'var(--an-error)', margin: 0 }}>
              NO MIDNIGHT WALLET DETECTED. INSTALL LACE OR 1AM, THEN RELOAD.
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
            <button
              onClick={() => enterAs('org')}
              disabled={connecting || availableWallets.length === 0}
              className="an-brutal"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--an-unit)',
                padding: 'var(--an-gutter)',
                background: 'var(--an-surface-low)',
                color: 'var(--an-primary)',
                cursor: connecting ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'border-color var(--an-fast) ease, background-color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
              }}
            >
              <span className="msx" style={{ fontSize: 28 }}>apartment</span>
              <span className="an-label">CONTINUE AS ORGANIZATION</span>
              <span className="an-dense an-dim">POST PROGRAMS · TRIAGE REPORTS · PAY OUT</span>
            </button>
            <button
              onClick={() => enterAs('hunter')}
              disabled={connecting || availableWallets.length === 0}
              className="an-brutal"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--an-unit)',
                padding: 'var(--an-gutter)',
                background: 'var(--an-surface-low)',
                color: 'var(--an-primary)',
                cursor: connecting ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'border-color var(--an-fast) ease, background-color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
              }}
            >
              <span className="msx" style={{ fontSize: 28 }}>target</span>
              <span className="an-label">CONTINUE AS HACKER</span>
              <span className="an-dense an-dim">BROWSE TARGETS · SUBMIT REPORTS · STAY ANONYMOUS</span>
            </button>
          </div>

          {connecting && (
            <p className="an-label an-secondary-text" style={{ margin: 0, textAlign: 'center' }}>
              GENERATING ZK PROOF SESSION…
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--an-unit)', marginTop: 'var(--an-unit)' }}>
          <div style={{ flexGrow: 1, height: 1, background: 'var(--an-outline-variant)' }} />
          <span className="an-label an-dim">OR</span>
          <div style={{ flexGrow: 1, height: 1, background: 'var(--an-outline-variant)' }} />
        </div>

        <a href="#/programs" className="an-btn an-btn--ghost" style={{ textDecoration: 'none' }}>
          BROWSE PROGRAMS AS GUEST
        </a>

        {error && (
          <p className="an-dense" style={{ color: 'var(--an-error)', margin: 0 }}>
            {error}
          </p>
        )}

        <div className="an-brutal-t" style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-stack-sm)', textAlign: 'center' }}>
          <span className="an-label an-dim">
            NO EMAIL. NO NAME. YOUR IDENTITY IS A SECRET KEY THAT NEVER LEAVES THIS BROWSER.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecureAccess;
