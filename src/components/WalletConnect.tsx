import React from 'react';

const truncateHex = (s: string, head = 14, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

interface WalletConnectProps {
  walletState: string;
  address: string | null;
  network: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDetecting: boolean;
  noWallet: boolean;
  isReady: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  walletState,
  address,
  network,
  isConnected,
  isConnecting,
  isDetecting,
  noWallet,
  isReady,
  connect,
  disconnect,
}) => {
  const actionLabel = isConnecting
    ? 'CONNECTING…'
    : isDetecting || noWallet
      ? 'AWAITING LACE'
      : 'CONNECT LACE';

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
              background: isConnected ? 'var(--color-primary)' : 'var(--color-secondary-container)',
            }}
          />
          MIDNIGHT / {network.toUpperCase()}
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
            <span>DISCONNECT</span>
          </button>
        ) : (
          <button
            className="btn-secondary"
            onClick={connect}
            disabled={!isReady || noWallet}
          >
            {isDetecting || isConnecting ? (
              <>
                <span className="spinner" style={{ marginRight: 8 }} />
                {actionLabel}
              </>
            ) : noWallet ? (
              'NO WALLET'
            ) : (
              actionLabel
            )}
          </button>
        )}
      </div>
    </nav>
  );
};

export default WalletConnect;
