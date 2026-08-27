import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const RedactionBar: React.FC<{ w?: string }> = ({ w = '12ch' }) => (
  <span className="redaction-bar" style={{ width: w }}>{'█'.repeat(8)}</span>
);

const Landing: React.FC<Props> = () => {
  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="an-brutal-b"
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--an-stack-lg) 0',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--an-gutter)', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--an-stack-md)' }}>
            <h1 className="an-hook">PEHCHAN ZYADA CHAHIYE YA PAISA?</h1>
            <h2 className="an-punchline an-dim">PAISA. Pehchan should not follow my brotherrrr</h2>
            <p className="an-dense" style={{ maxWidth: 640, margin: 0 }}>
              Build a reputation, not an exposure trail. Prove the bug. Not who you are.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-gutter)', marginTop: 'var(--an-stack-sm)' }}>
              <button onClick={() => navigate('/login')} className="an-btn" style={{ width: 'auto', borderColor: 'var(--an-accent)', boxShadow: 'rgba(74, 222, 128, 0.2) 0px 0px 15px' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--an-accent)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                I'M A HACKER [GOOD FAITH OBV.] →
              </button>
              <button onClick={() => navigate('/login-org')} className="an-btn an-btn--ghost" style={{ width: 'auto', borderColor: '#60a5fa', boxShadow: 'rgba(96, 165, 250, 0.15) 0px 0px 15px' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#60a5fa')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--an-surface-lowest)')}
              >
                I'M AN ORGANIZATION →
              </button>
              <a href="#/orgs" className="an-label an-dim" style={{ alignSelf: 'flex-start', marginTop: 'var(--an-unit)', textDecoration: 'none', borderBottom: '1px solid var(--an-outline-variant)' }}>
                CONTACTED BY A HACKER? REACH OUT →
              </a>
            </div>
          </div>

          {/* Researcher card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 'var(--an-stack-md)' }}>
            <div
              className="an-brutal"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 380,
                background: 'var(--an-surface-lowest)',
                padding: 'var(--an-stack-md)',
              }}
            >
              <div
                aria-hidden
                className="an-brutal"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  background: 'rgba(18, 20, 20, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 300ms var(--an-ease-out)',
                  borderColor: 'var(--an-primary)',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '0')}
              >
                <span className="an-label" style={{ border: '1px solid var(--an-primary)', padding: '8px 16px', letterSpacing: '0.1em' }}>
                  RESTRICTED VIEW
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--an-stack-md)' }}>
                <span className="an-label an-dim">RESEARCHER_ID</span>
                <span className="msx an-dim">fingerprint</span>
              </div>

              <div style={{ marginBottom: 'var(--an-stack-md)' }}>
                <div className="an-dense" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>@nightshift</div>
                <div style={{ height: 1, background: 'var(--an-outline-variant)', margin: 'var(--an-gutter) 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
                  <div>
                    <div className="an-label an-dim" style={{ marginBottom: 4 }}>TRUST_SCORE</div>
                    <div className="an-dense" style={{ fontSize: 18 }}>94</div>
                  </div>
                  <div>
                    <div className="an-label an-dim" style={{ marginBottom: 4 }}>REPORTS</div>
                    <div className="an-dense" style={{ fontSize: 18 }}>47</div>
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: 'var(--an-unit)' }}>
                    <div className="an-label an-dim" style={{ marginBottom: 4 }}>TOTAL_BOUNTIES</div>
                    <div className="an-dense" style={{ fontSize: 18 }}>
                      <span style={{ color: 'var(--an-accent)' }}>₹</span> <RedactionBar w="8ch" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="an-brutal" style={{ background: 'var(--an-surface-container)', padding: 'var(--an-gutter)' }}>
                <div className="an-label an-dim" style={{ marginBottom: 'var(--an-unit)' }}>REAL_IDENTITY</div>
                <div className="an-dense" style={{ wordBreak: 'break-all' }}>
                  <RedactionBar />
                  <br />
                  <RedactionBar w="16ch" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TONAL SHIFT ──────────────────────────────────────── */}
      <section
        className="an-brutal-b"
        style={{ padding: 'var(--an-stack-lg) 0', background: 'var(--an-surface)', textAlign: 'center' }}
      >
        <h3 className="an-punchline" style={{ maxWidth: 760, margin: '0 auto', textTransform: 'uppercase', padding: '0 var(--an-margin-safe)' }}>
          Your identity shouldn't be a part of the vulnerability report.
        </h3>
      </section>

      {/* ── DATA VISIBILITY MATRIX ───────────────────────────── */}
      <section style={{ padding: 'var(--an-stack-lg) 0' }}>
        <div className="an-label an-dim an-brutal-b" style={{ paddingBottom: 'var(--an-unit)', marginBottom: 'var(--an-stack-sm)' }}>
          DATA VISIBILITY MATRIX
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 1, background: 'var(--an-outline-variant)', padding: 1 }}>
          {/* Reputation */}
          <div style={{ background: 'var(--an-bg)', padding: 'var(--an-stack-lg) var(--an-gutter)', display: 'flex', flexDirection: 'column' }}>
            <div
              className="an-dense"
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-accent)', paddingBottom: 4 }}
            >
              REPUTATION
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, flexGrow: 1 }} className="an-dense">
              {[['HANDLE', '@nightshift'], ['TRUST_SCORE', '94'], ['VALID_REPORTS', '47']].map(([k, v]) => (
                <li key={k} className="an-brutal-b" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span className="an-dim">-&gt; {k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            <div className="an-label" style={{ marginTop: 'var(--an-stack-md)', alignSelf: 'flex-start' }}>[ FULLY VISIBLE ]</div>
          </div>

          {/* Identity */}
          <div style={{ background: 'var(--an-surface-lowest)', padding: 'var(--an-stack-lg) var(--an-gutter)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div className="an-hatch" />
            <div
              className="an-dense an-dim"
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 'var(--an-stack-md)', borderBottom: '1px solid #f87171', paddingBottom: 4, position: 'relative', zIndex: 1 }}
            >
              IDENTITY
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, flexGrow: 1, position: 'relative', zIndex: 1 }} className="an-dense">
              {[['FULL_NAME', '10ch'], ['ADDRESS', '14ch'], ['AADHAAR', '8ch']].map(([k, w]) => (
                <li key={k} className="an-brutal-b" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span className="an-dim">-&gt; {k}</span>
                  <RedactionBar w={w} />
                </li>
              ))}
            </ul>
            <div className="an-label" style={{ marginTop: 'var(--an-stack-md)', alignSelf: 'flex-start', color: 'var(--an-error)', position: 'relative', zIndex: 1 }}>
              [ REDACTED ]
            </div>
          </div>
        </div>
      </section>

      {/* bottom heavy bar */}
      <div style={{ height: 32, background: 'var(--an-primary)' }} />
    </div>
  );
};

export default Landing;
