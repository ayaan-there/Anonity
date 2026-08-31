import React, { useEffect, useState } from 'react';
import { useMidnight } from './hooks/useMidnight';
import { parseHash, navigate, type Route } from './router';
import { NotificationBell, AvatarSquare } from './components/NavWidgets';
import Login from './components/Login';
import OrgsPage from './components/OrgsPage';
import Landing from './components/Landing';
import DiscoverPrograms from './components/DiscoverPrograms';
import ProgramDetails from './components/ProgramDetails';
import CreateProgram from './components/CreateProgram';
import SubmitReport from './components/SubmitReport';
import Dashboard from './components/Dashboard';
import Inbox from './components/Inbox';
import EditProgram from './components/EditProgram';
import { useSession } from './hooks/useSession';
import { initAuth, signOut } from './lib/supabase';
import { isTransparentDemoMode } from './lib/deployment-mode';

const App: React.FC = () => {
  const midnight = useMidnight();
  const session = useSession();
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => { void initAuth(); }, []);

  // Org persona follows Supabase. Hunter persona is local and has no session.
  const { setPersona } = midnight;
  useEffect(() => {
    if (session.role) setPersona(session.role);
  }, [session.role, setPersona]);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isConnected = midnight.walletState === 'connected';
  const isConnecting = midnight.walletState === 'connecting';
  const hasPersona = Boolean(midnight.persona || session.email);
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
          href="#/"
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
          {midnight.persona === 'org' && <NavLink to="/dashboard" label="DASHBOARD" active={route.page === 'dashboard'} />}
          {!isConnected && <NavLink to="/orgs" label="FOR ORGS" active={route.page === 'orgs'} />}
          {hasPersona && <NavLink to="/inbox" label="INBOX" active={route.page === 'inbox'} />}
        </div>
        <div style={{ display: 'flex', gap: 'var(--an-gutter)', alignItems: 'center' }}>
          {hasPersona ? (
            <>
              {!isConnected ? (
                <button
                  onClick={() => (isConnecting ? undefined : midnight.connect())}
                  disabled={isConnecting}
                  className="an-btn"
                  style={{ width: 'auto', padding: '8px 14px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
                >
                  {isConnecting ? 'CONNECTING…' : 'CONNECT WALLET'}
                </button>
              ) : shortAddr ? (
                <>
                  <NotificationBell midnight={midnight} />
                  <button
                    onClick={() => navigate('/profile')}
                    aria-label="Profile"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <AvatarSquare address={midnight.address ?? ''} />
                  </button>
                </>
              ) : null}
              <span className="an-label an-dim">{session.email ?? 'LOCAL HUNTER ID'}</span>
              <button
                onClick={() => {
                  if (session.email) void signOut();
                  midnight.disconnect();
                  midnight.setPersona(null);
                  navigate('/');
                }}
                className="an-label"
                style={{ background: 'none', border: 'none', color: 'var(--an-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                LOGOUT
              </button>
            </>
          ) : (
            <button
              onClick={() => (isConnecting ? undefined : navigate('/login'))}
              disabled={isConnecting}
              className="an-btn an-btn--ghost"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            >
              {isConnecting ? 'CONNECTING…' : 'LOGIN'}
            </button>
          )}
        </div>
      </nav>

      {isTransparentDemoMode && (
        <div style={{ padding: '10px var(--an-margin-safe)', background: '#f5c542', color: '#111318', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.04em', fontWeight: 700 }}>
          TRANSPARENT DEMO MODE — STAKE AND PAYOUT FUNDING USE PUBLIC UNSHIELDED NIGHT. THIS IS NOT THE PRIVACY DEPLOYMENT.
        </div>
      )}
      <main style={{ flexGrow: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: 'var(--an-stack-lg) var(--an-margin-safe) var(--an-stack-md)' }}>
        {route.page === 'landing' && <Landing midnight={midnight} />}
        {route.page === 'login' && <Login midnight={midnight} role="hunter" />}
        {route.page === 'login-org' && <Login midnight={midnight} role="org" />}
        {route.page === 'orgs' && <OrgsPage midnight={midnight} />}
        {route.page === 'dashboard' && <Dashboard midnight={midnight} />}
        {route.page === 'edit' && <EditProgram midnight={midnight} id={route.id} />}
        {route.page === 'programs' && <DiscoverPrograms midnight={midnight} />}
        {route.page === 'program' && <ProgramDetails midnight={midnight} id={route.id} />}
        {route.page === 'submission' && <Inbox midnight={midnight} submissionId={route.id} />}
        {route.page === 'create' && <CreateProgram midnight={midnight} />}
        {route.page === 'submit' && <SubmitReport midnight={midnight} bountyId={route.bountyId} />}
        {route.page === 'inbox' && <Inbox midnight={midnight} submissionId={route.id} />}
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

const ProfilePlaceholder: React.FC<{ midnight: ReturnType<typeof useMidnight> }> = ({ midnight }) => {
  const address = midnight.address ?? 'NOT CONNECTED';
  const shortAddress = address.length > 24 ? `${address.slice(0, 12)}…${address.slice(-8)}` : address;
  return (
    <div className="profile-shell">
      <aside className="profile-sidebar an-brutal">
        <button className="profile-nav profile-nav--active">PROFILE</button>
        <button className="profile-nav">BADGES</button>
        <button className="profile-nav">ACTIVITY</button>
        <button className="profile-nav">CONNECT YOUR WALLET</button>
      </aside>
      <section className="profile-main">
        <header className="an-brutal-b profile-identity">
          <div className="profile-avatar">AN</div>
          <div>
            <p className="an-label an-secondary-text">ANONITY HUNTER</p>
            <h1 className="an-punchline">IDENTITY REDACTED</h1>
            <p className="an-dense an-dim" title={address}>{shortAddress}</p>
          </div>
          <button className="an-btn an-btn--ghost profile-edit">EDIT PROFILE</button>
        </header>
        <div className="profile-stat-grid">
          {['REPORTS SUBMITTED', 'VALID REPORTS', 'NIGHT EARNED', 'REPUTATION'].map((label) => (
            <div key={label} className="an-brutal profile-stat">
              <strong>—</strong>
              <span className="an-label an-secondary-text">{label}</span>
            </div>
          ))}
        </div>
        <div className="profile-columns">
          <section className="an-section">
            <div className="an-section__tab">ACTIVITY</div>
            <p className="an-dense an-dim">Your private activity will appear here after your first report.</p>
            <a href="#/programs" className="an-btn" style={{ width: 'auto', alignSelf: 'flex-start', textDecoration: 'none' }}>DISCOVER PROGRAMS</a>
          </section>
          <section className="an-section">
            <div className="an-section__tab">CREDITS</div>
            <div className="profile-credit"><strong>0</strong><span className="an-label an-secondary-text">VALID REPORTS</span></div>
            <div className="profile-credit"><strong>0</strong><span className="an-label an-secondary-text">NIGHT RECEIVED</span></div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default App;
