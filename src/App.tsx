import React, { useEffect, useState } from 'react';
import { useMidnight } from './hooks/useMidnight';
import { parseHash, navigate, type Route } from './router';
import SecureAccess from './components/SecureAccess';
import DiscoverPrograms from './components/DiscoverPrograms';
import ProgramDetails from './components/ProgramDetails';
import CreateProgram from './components/CreateProgram';
import SubmitReport from './components/SubmitReport';

const App: React.FC = () => {
  const midnight = useMidnight();
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isConnected = midnight.walletState === 'connected';
  const isConnecting = midnight.walletState === 'connecting';
  const shortAddr = midnight.address
    ? `${midnight.address.slice(0, 10)}…${midnight.address.slice(-6)}`
    : null;

  const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
    <a
      href={`#${to}`}
      className="an-label"
      style={{
        color: active ? 'var(--an-primary)' : 'var(--an-secondary)',
        textDecoration: 'none',
        padding: '4px 0',
        borderBottom: active ? '1px solid var(--an-primary)' : '1px solid transparent',
        transition: 'color var(--an-fast) ease, border-color var(--an-fast) ease',
      }}
    >
      {label}
    </a>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--an-bg)' }}>
      <nav
        className="an-brutal-b"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px var(--an-margin-safe)',
          background: 'var(--an-bg)',
        }}
      >
        <a
          href="#/programs"
          className="an-mono"
          style={{
            fontWeight: 700,
            letterSpacing: '-0.03em',
            fontSize: 16,
            color: 'var(--an-primary)',
            textDecoration: 'none',
          }}
        >
          ANONITY
        </a>
        <div style={{ display: 'flex', gap: 'var(--an-gutter)', alignItems: 'center' }}>
          <NavLink to="/programs" label="PROGRAMS" active={route.page === 'programs' || route.page === 'program'} />
          <NavLink to="/inbox" label="INBOX" active={route.page === 'inbox'} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--an-gutter)', alignItems: 'center' }}>
          {isConnected && shortAddr ? (
            <>
              <span className="an-label an-dim" title={midnight.address ?? ''}>
                {shortAddr}
              </span>
              <button
                onClick={() => navigate('/profile')}
                aria-label="Profile"
                className="msx"
                style={{ background: 'none', border: 'none', color: 'var(--an-primary)', cursor: 'pointer', fontSize: 20, padding: 0 }}
              >
                account_circle
              </button>
              <button onClick={midnight.disconnect} className="an-label" style={{ background: 'none', border: 'none', color: 'var(--an-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                DISCONNECT
              </button>
            </>
          ) : (
            <button
              onClick={() => (isConnecting ? undefined : navigate('/access'))}
              disabled={isConnecting}
              className="an-btn an-btn--ghost"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            >
              {isConnecting ? 'CONNECTING…' : 'CONNECT WALLET'}
            </button>
          )}
        </div>
      </nav>

      <main style={{ flexGrow: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: 'var(--an-stack-lg) var(--an-margin-safe) var(--an-stack-md)' }}>
        {route.page === 'access' && <SecureAccess midnight={midnight} />}
        {route.page === 'programs' && <DiscoverPrograms midnight={midnight} />}
        {route.page === 'program' && <ProgramDetails midnight={midnight} id={route.id} />}
        {route.page === 'create' && <CreateProgram midnight={midnight} />}
        {route.page === 'submit' && <SubmitReport midnight={midnight} bountyId={route.bountyId} />}
        {route.page === 'inbox' && <InboxPlaceholder midnight={midnight} />}
        {route.page === 'profile' && <ProfilePlaceholder midnight={midnight} />}
      </main>

      <footer
        className="an-brutal-t"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--an-stack-sm)',
          padding: '12px var(--an-margin-safe)',
          background: 'var(--an-surface-lowest)',
        }}
      >
        <span className="an-label an-secondary-text">© 2026 ANONITY. IDENTITY REDACTED. ALL RIGHTS RESERVED.</span>
        <div style={{ display: 'flex', gap: 'var(--an-stack-md)' }}>
          {['PRIVACY', 'TERMS', 'ENCRYPTION'].map((l) => (
            <a key={l} href="#/programs" className="an-label an-dim" style={{ textDecoration: 'none' }}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
};

const InboxPlaceholder: React.FC<{ midnight: ReturnType<typeof useMidnight> }> = ({ midnight }) => (
  <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
    <h1 className="an-hook">INBOX</h1>
    <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
      {midnight.walletState === 'connected'
        ? 'NO NOTIFICATIONS. YOUR ACTIVITY IS PRIVATE — EVEN FROM US.'
        : 'CONNECT A WALLET TO RECEIVE ENCRYPTED ALERTS.'}
    </p>
  </div>
);

const ProfilePlaceholder: React.FC<{ midnight: ReturnType<typeof useMidnight> }> = ({ midnight }) => (
  <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
    <h1 className="an-hook">PROFILE</h1>
    <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)', wordBreak: 'break-all' }}>
      {midnight.address ?? 'NOT CONNECTED'}
    </p>
    <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
      IDENTITY = COMMITMENT. NO NAME. NO EMAIL. NO HISTORY.
    </p>
  </div>
);

export default App;
