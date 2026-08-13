import React from 'react';

const truncateHex = (s: string, head = 14, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

interface WalletConnectProps {
  address: string | null;
  network: string;
  isConnected: boolean;
  connecting: boolean;
  detecting: boolean;
  noWallet: boolean;
  ready: boolean;
  error: string | null;
  availableWallets: string[];
  selectedWalletId: string | null;
  onSelectWallet: (id: string) => void;
  disconnect: () => void;
  onConnect: () => void;
}

const walletDisplayName = (id: string): string => {
  if (id.toLowerCase() === '1am') return '1AM';
  if (id.toLowerCase().includes('lace')) return 'Lace';
  return id.length > 16 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
};

const WalletConnect: React.FC<WalletConnectProps> = ({
  address,
  network,
  isConnected,
  connecting,
  detecting,
  noWallet,
  ready,
  error,
  availableWallets,
  selectedWalletId,
  onSelectWallet,
  disconnect,
  onConnect,
}) => {
  const actionLabel = connecting
    ? 'CONNECTING…'
    : detecting || noWallet
      ? 'AWAITING WALLET'
      : 'CONNECT WALLET';

  const showPicker = !isConnected && availableWallets.length > 1;

  return (
    <nav
      style={{
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '16px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
      className="ln-navbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          className="mono"
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--color-primary)',
          }}
        >
          ANONITY
        </span>
        <span
          className="caps"
          style={{ color: 'var(--color-on-surface-variant)', display: 'none' }}
        >
          / PRIVATE REPUTATION PROTOCOL
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span
          className="caps"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-on-surface-variant)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#b497cf',
            }}
          />
          {network.toUpperCase()}
        </span>
        {isConnected ? (
          <button
            className="btn-secondary"
            onClick={disconnect}
            title={address ?? ''}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: '0.04em',
                textTransform: 'none',
              }}
            >
              {truncateHex(address ?? '', 14, 6)}
            </span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ color: 'var(--color-error)' }}>DISCONNECT</span>
          </button>
        ) : (
          <>
            {showPicker && (
              <select
                className="caps"
                aria-label="Select wallet"
                value={selectedWalletId ?? availableWallets[0]}
                onChange={(e) => onSelectWallet(e.target.value)}
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '8px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {availableWallets.map((id) => (
                  <option key={id} value={id}>
                    {walletDisplayName(id)}
                  </option>
                ))}
              </select>
            )}
            <button
              className="btn-prove"
              onClick={onConnect}
              disabled={!ready || connecting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {(connecting || detecting) && <span className="spinner" />}
              {actionLabel}
            </button>
          </>
        )}
      </div>
      {!isConnected && error && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: '100%',
            right: 32,
            left: 32,
            marginTop: 8,
            padding: '10px 16px',
            background: 'var(--color-error-container)',
            color: 'var(--color-on-error-container)',
            border: '1px solid var(--color-error-container)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.55,
            zIndex: 60,
          }}
        >
          <span className="caps-xs" style={{ marginRight: 8 }}>
            ERROR
          </span>
          {error}
        </div>
      )}
    </nav>
  );
};

export default WalletConnect;
