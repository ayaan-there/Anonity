import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import { authReady, signInWithEmail, signUpWithEmail } from '../lib/supabase';
import {
  downloadHunterSecretBackup,
  exportHunterSecretKey,
  getHunterSecretKey,
  getOrCreateHunterSecretKey,
  importHunterSecretKey,
} from '../lib/hunter-identity';

type Props = { midnight: ReturnType<typeof useMidnight>; role: 'hunter' | 'org' };

const Login: React.FC<Props> = ({ midnight, role }) => {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [hasHunterKey, setHasHunterKey] = React.useState(() => Boolean(getHunterSecretKey()));
  const fileRef = React.useRef<HTMLInputElement>(null);
  const isOrg = role === 'org';

  const routeAfterAuth = (r: 'hunter' | 'org') => {
    midnight.setPersona(r);
    navigate(r === 'org' ? (midnight.bounties.length === 0 ? '/create' : '/dashboard') : '/programs');
  };

  const enterHunter = () => {
    getOrCreateHunterSecretKey();
    setHasHunterKey(true);
    setNotice('LOCAL HUNTER IDENTITY READY. BACK UP YOUR KEY BEFORE SUBMITTING.');
    midnight.setPersona('hunter');
    setTimeout(() => navigate('/programs'), 500);
  };

  const restoreHunter = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const encoded = await file.text();
    if (!importHunterSecretKey(encoded)) {
      setNotice('THAT BACKUP IS NOT A VALID ANONITY HUNTER KEY.');
      return;
    }
    setHasHunterKey(true);
    setNotice('HUNTER IDENTITY RESTORED LOCALLY.');
    midnight.setPersona('hunter');
    setTimeout(() => navigate('/programs'), 500);
  };

  const handleOrgEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    setPending(true);
    setNotice(null);
    if (!authReady) {
      midnight.setPersona('org');
      setNotice('DEMO ORGANIZATION SESSION READY.');
      setTimeout(() => navigate('/dashboard'), 500);
      setPending(false);
      return;
    }
    try {
      if (mode === 'signup') {
        const data = await signUpWithEmail(email, password);
        if (data.session?.user) routeAfterAuth('org');
        else setNotice('ORGANIZATION CREATED. CHECK YOUR EMAIL, THEN SIGN IN.');
      } else {
        await signInWithEmail(email, password);
        routeAfterAuth('org');
      }
    } catch (error: any) {
      setNotice(error?.message ?? 'Organization authentication failed.');
    } finally {
      setPending(false);
    }
  };

  if (!isOrg) {
    return (
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <div className="an-hatch" />
        <div className="an-brutal" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 640, background: 'var(--an-surface)', padding: 'var(--an-stack-lg) var(--an-stack-md)', display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 className="an-hook" style={{ fontSize: 'clamp(34px, 5vw, 72px)' }}>PROVE WITHOUT REVEALING</h1>
            <p className="an-label an-secondary-text an-brutal-t" style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-unit)' }}>NO EMAIL. NO NAME. NO HUNTER ACCOUNT.</p>
          </div>
          <p className="an-dense an-secondary-text">Anonity creates a local secret identity in this browser. It never leaves your device and cannot be recovered if lost.</p>
          <button type="button" className="an-btn" onClick={enterHunter} disabled={pending}>
            {hasHunterKey ? 'CONTINUE WITH LOCAL IDENTITY' : 'CREATE LOCAL HUNTER IDENTITY'}
          </button>
          <button type="button" className="an-btn an-btn--ghost" onClick={() => fileRef.current?.click()}>RESTORE HUNTER KEY BACKUP</button>
          <input ref={fileRef} type="file" accept="text/plain,.txt" onChange={(event) => void restoreHunter(event)} style={{ display: 'none' }} />
          {hasHunterKey && (
            <button type="button" className="an-label an-secondary-text" onClick={downloadHunterSecretBackup} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              DOWNLOAD KEY BACKUP ({exportHunterSecretKey().slice(0, 8)}...)
            </button>
          )}
          {notice && <p className="an-dense" style={{ color: notice.startsWith('LOCAL') || notice.startsWith('HUNTER') ? 'var(--an-accent)' : 'var(--an-error)', margin: 0 }}>{notice}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: 'var(--an-stack-lg) 0' }}>
      <div className="an-hatch" />
      <div className="an-brutal" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 640, background: 'var(--an-surface)', padding: 'var(--an-stack-lg) var(--an-stack-md)', display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="an-hook" style={{ fontSize: 'clamp(34px, 5vw, 72px)' }}>PROTECT YOUR ORG WITH US</h1>
          <p className="an-label an-secondary-text an-brutal-t" style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-unit)' }}>ORGANIZATION TRIAGE ACCESS</p>
        </div>
        <form onSubmit={(event) => void handleOrgEmail(event)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)' }}>
          <label className="an-label an-secondary-text" htmlFor="org-email">EMAIL</label>
          <input id="org-email" type="email" required className="an-input" placeholder="security@example.org" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          <label className="an-label an-secondary-text" htmlFor="org-password">PASSWORD</label>
          <input id="org-password" type="password" required minLength={6} className="an-input" placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          <button type="submit" disabled={pending} className="an-btn">{pending ? 'AWAITING...' : mode === 'signin' ? 'CONTINUE WITH EMAIL' : 'CREATE ORGANIZATION'}</button>
        </form>
        {notice && <p className="an-dense" style={{ color: notice.startsWith('DEMO') || notice.startsWith('ORGANIZATION') ? 'var(--an-accent)' : 'var(--an-error)', margin: 0 }}>{notice}</p>}
        <button type="button" onClick={() => setMode((value) => value === 'signin' ? 'signup' : 'signin')} className="an-label an-secondary-text" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          {mode === 'signin' ? 'New organization? Create account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

export default Login;
