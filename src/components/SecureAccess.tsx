import React, { useEffect } from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const SecureAccess: React.FC<Props> = ({ midnight }) => {
  const { walletState, availableWallets, selectedWalletId, selectWallet, connect, error } = midnight;
  const isConnected = walletState === 'connected';

  useEffect(() => {
    if (isConnected) navigate('/programs');
  }, [isConnected]);

  const connecting = walletState === 'connecting';

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
          <span className="an-label an-dim">&gt;_ SELECT WALLET</span>

          {availableWallets.length === 0 && walletState === 'no-wallet' && (
            <p className="an-dense" style={{ color: 'var(--an-error)', margin: 0 }}>
              NO MIDNIGHT WALLET DETECTED. INSTALL LACE OR 1AM, THEN RELOAD.
            </p>
          )}

          <div role="radiogroup" aria-label="Wallet" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)' }}>
            {availableWallets.map((id) => {
              const label = id.toLowerCase().includes('1am') ? '1AM — PROVES IN-BROWSER' : id.toUpperCase();
              const active = selectedWalletId === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectWallet(id)}
                  className="an-label"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: active ? 'var(--an-surface-high)' : 'var(--an-surface-low)',
                    border: `1px solid ${active ? 'var(--an-primary)' : 'var(--an-outline-variant)'}`,
                    color: 'var(--an-primary)',
                    cursor: 'pointer',
                    transition: 'border-color var(--an-fast) ease, background-color var(--an-fast) ease',
                  }}
                >
                  {label}
                  <span className="msx">{active ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => connect()} disabled={connecting || availableWallets.length === 0} className="an-btn" style={{ marginTop: 'var(--an-stack-sm)' }}>
            {connecting ? 'CONNECTING…' : 'CONNECT'}
          </button>
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
