import React, { useEffect } from 'react';
import { useMidnight } from './hooks/useMidnight';
import WalletConnect from './components/WalletConnect';
import CircuitCall from './components/CircuitCall';
import './App.css';

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
    availableWallets,
    selectedWalletId,
    selectWallet,
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
          ? 'DETECTING WALLET INJECTOR…'
          : noWallet
            ? 'NO WALLET FOUND.'
            : isConnected
              ? loading
                ? 'GENERATING ZK PROOF · LOCAL PROVER.'
                : result
                  ? 'PROOF ACCEPTED · WAITING FOR NEXT CALL.'
                  : 'WALLET READY · AWAITING CIRCUIT CALL.'
              : 'SYSTEM READY / WAITING FOR WALLET CONNECTION'}
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
          <StackRow label="WALLET">
            {selectedWalletId
              ? selectedWalletId.toLowerCase() === '1am'
                ? '1AM'
                : selectedWalletId.toLowerCase().includes('lace')
                  ? 'LACE'
                  : 'DAPP CONNECTOR'
              : 'DAPP CONNECTOR'}
          </StackRow>
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
        connecting={isConnecting}
        detecting={isDetecting}
        noWallet={noWallet}
        ready={isReady}
        error={error}
        availableWallets={availableWallets}
        selectedWalletId={selectedWalletId}
        onSelectWallet={selectWallet}
        disconnect={disconnect}
        onConnect={connect}
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
          noWallet={noWallet}
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
