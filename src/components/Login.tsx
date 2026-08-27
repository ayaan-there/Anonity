import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import { authReady, signInWithEmail, signUpWithEmail } from '../lib/supabase';

type Props = { midnight: ReturnType<typeof useMidnight>; role: 'hunter' | 'org' };

const Login: React.FC<Props> = ({ midnight, role }) => {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const isOrg = role === 'org';

  const afterAuth = () => {
    midnight.setPersona(role);
    if (role === 'org') {
      navigate(midnight.bounties.length === 0 ? '/create' : '/dashboard');
    } else {
      navigate('/programs');
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setPending(true);
    setNotice(null);

    if (!authReady) {
      // Demo entry: no Supabase yet — the bootcamp demo account model
      // goes live once VITE_SUPABASE_URL/ANON_KEY are configured.
      midnight.setPersona(role);
      setNotice(`DEMO LOGIN (${role.toUpperCase()}) — AUTHENTICATED LOCALLY.`);
      setTimeout(() => {
        if (role === 'org') navigate(midnight.bounties.length === 0 ? '/create' : '/dashboard');
        else navigate('/programs');
      }, 900);
      return;
    }

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, role);
        setNotice('CHECK YOUR INBOX TO CONFIRM YOUR ACCOUNT, THEN LOG IN.');
      } else {
        await signInWithEmail(email, password);
        afterAuth();
      }
    } catch (err: any) {
      setNotice(err?.message ?? 'Authentication failed.');
    } finally {
      setPending(false);
    }
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
          <h1 className="an-hook" style={{ fontSize: 'clamp(34px, 5vw, 72px)' }}>
            {isOrg ? 'PROTECT YOUR ORG WITH US' : 'prove without revealing'}
          </h1>
          <p
            className="an-label an-secondary-text an-brutal-t"
            style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-unit)' }}
          >
            {isOrg
              ? 'YOU MIGHT BUT THE HACKERS NEVER STOP. LET US HANDLE THE LOAD.'
              : 'BUILD A REPUTATION. NOT AN EXPOSURE TRAIL.'}
          </p>
        </div>

        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', width: '100%', marginTop: 'var(--an-stack-sm)' }}>
          <div>
            <label className="an-label an-secondary-text an-field-label" htmlFor="email">EMAIL</label>
            <input
              id="email"
              type="email"
              required
              className="an-input"
              placeholder="terminal@anonity.network"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="an-label an-secondary-text an-field-label" htmlFor="pass">PASSWORD</label>
            <input
              id="pass"
              type="password"
              required
              minLength={6}
              className="an-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          <button type="submit" disabled={pending} className="an-btn">
            {pending ? 'AWAITING…' : mode === 'signin' ? 'CONTINUE WITH EMAIL' : 'JOIN ANONITY'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--an-unit)' }}>
          <div style={{ flexGrow: 1, height: 1, background: 'var(--an-outline-variant)' }} />
          <span className="an-label an-dim">OR</span>
          <div style={{ flexGrow: 1, height: 1, background: 'var(--an-outline-variant)' }} />
        </div>

        <button
          type="button"
          disabled
          className="an-btn an-btn--ghost"
          title="Google sign-in will enable after domain verification"
          style={{ width: '100%' }}
        >
          <span className="msx" style={{ fontSize: 18 }}>login</span> SIGN IN WITH GOOGLE
        </button>

        {notice && (
          <p className="an-dense" style={{ color: notice.startsWith('DEMO') || notice.startsWith('CHECK') ? 'var(--an-accent)' : 'var(--an-error)', margin: 0 }}>
            {notice}
          </p>
        )}

        <div className="an-brutal-t" style={{ marginTop: 'var(--an-stack-sm)', paddingTop: 'var(--an-stack-sm)', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            className="an-label an-secondary-text"
            style={{ background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: 2 }}
          >
            {mode === 'signin' ? 'New to Anonity? Create account' : 'Already have an account? Sign in'}
          </button>
          <p className="an-label an-dim" style={{ marginTop: 'var(--an-stack-sm)' }}>
            {isOrg
              ? 'ON-CHAIN IDENTITY = ORG COMMITMENT. WALLET CONNECTION COMES AFTER LOGIN.'
              : 'NO NAME REQUIRED. YOUR ON-CHAIN IDENTITY IS A SECRET KEY THAT NEVER LEAVES THIS BROWSER.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
