import React, { useEffect } from 'react';
import { useMidnight } from './hooks/useMidnight';
import WalletConnect from './components/WalletConnect';
import CircuitCall from './components/CircuitCall';

const NETWORK = (() => {
  const v = import.meta.env.VITE_NETWORK_ID as string | undefined;
  return (v && v.trim()) || 'preview';
})();

const CONTRACT = (() => {
  const v = import.meta.env.VITE_DEFAULT_CONTRACT as string | undefined;
  if (!v || !v.trim() || /^PLACEHOLDER/i.test(v)) return null;
  return v.trim();
})();

const App: React.FC = () => {
  const {
    walletState,
    address,
    connect,
    disconnect,
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
    clearError,
  } = useMidnight();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 9000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const isConnected = walletState === 'connected';
  const isConnecting = walletState === 'connecting';
  const isDetecting = walletState === 'detecting';
  const noWallet = walletState === 'no-wallet';
  const isReady = walletState === 'ready' || isConnected;

  const SidebarStatus: React.FC = () => (
    <>
      <div
        style={{
          padding: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface-variant)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        {isDetecting
          ? 'DETECTING LACE INJECTOR…'
          : noWallet
            ? 'NO LACE WALLET FOUND.'
            : isConnected
              ? loading
                ? 'GENERATING ZK PROOF · LOCAL PROVER.'
                : result
                  ? 'PROOF ACCEPTED · WAITING FOR NEXT CALL.'
                  : 'WALLET READY · AWAITING CIRCUIT CALL.'
              : 'SYSTEM READY / WAITING FOR LACE CONNECTION'}
      </div>

      {isConnected && address && (
        <div style={{ marginTop: 16 }}>
          <div
            className="caps-xs"
            style={{ color: 'var(--color-on-surface-variant)', marginBottom: 4 }}
          >
            UNSHIELDED ADDRESS
          </div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--color-secondary)',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}
          >
            {address}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h4
          className="caps-sm"
          style={{
            color: 'var(--color-on-surface-variant)',
            margin: '0 0 12px',
            textTransform: 'uppercase',
          }}
        >
          STACK
        </h4>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <StackRow label="LANG">COMPACT</StackRow>
          <StackRow label="WALLET">LACE</StackRow>
          <StackRow label="PROOF">LOCAL ZK</StackRow>
        </ul>
      </div>
    </>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        color: 'var(--color-on-surface)',
      }}
    >
      <WalletConnect
        address={address}
        network={NETWORK}
        isConnected={isConnected}
        disconnect={disconnect}
      />

      <main
        style={{
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 1,
          background: 'var(--color-border)',
          width: '100%',
        }}
        className="anonty-grid"
      >
        <CircuitCall
          network={NETWORK}
          contract={CONTRACT}
          count={count}
          increment={increment}
          decrement={decrement}
          reset={reset}
          refreshCount={refreshCount}
          loading={loading}
          result={result}
          lastCircuit={lastCircuit}
          lastTxId={lastTxId}
          lastBlock={lastBlock}
          error={error}
          isConnected={isConnected}
          isConnecting={isConnecting}
          isDetecting={isDetecting}
          noWallet={noWallet}
          isReady={isReady}
          connect={connect}
        />

        <aside
          style={{
            background: 'var(--color-bg)',
            borderLeft: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <h3 className="caps" style={{ color: 'var(--color-primary)', margin: 0 }}>
              PRIVACY STATUS
            </h3>
          </div>
          <div style={{ padding: 20, flexGrow: 1 }}>
            <SidebarStatus />
          </div>
        </aside>
      </main>

      <footer
        style={{
          background: 'var(--color-surface-container-lowest)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '24px 32px',
          gap: 8,
          zIndex: 50,
        }}
        className="footer-row"
      >
        <div className="caps" style={{ color: 'var(--color-secondary)' }}>
          ANONITY / L2 SUBMISSION
        </div>
      </footer>

      <style>{`
        @media (min-width: 900px) {
          .anonty-grid {
            grid-template-columns: 1fr 320px !important;
          }
          .priv-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .hero-pad {
            padding-left: 32px !important;
            padding-right: 32px !important;
          }
          .footer-row {
            flex-direction: row !important;
          }
        }
        @media (max-width: 600px) {
          .flow-wrap {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
};

const StackRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em',
    }}
  >
    <span style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
    <span style={{ color: 'var(--color-primary)' }}>{children}</span>
  </li>
);

export default App;
