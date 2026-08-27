import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--an-surface-low)',
  border: '1px solid var(--an-outline-variant)',
  borderRadius: 0,
  color: 'var(--an-on-surface)',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  padding: 12,
  outline: 'none',
  transition: 'border-color var(--an-fast) ease, box-shadow var(--an-fast) ease',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--an-unit)',
  color: 'var(--an-secondary)',
};

const Corner: React.FC<{ pos: React.CSSProperties }> = ({ pos }) => (
  <div aria-hidden style={{ position: 'absolute', width: 8, height: 8, borderColor: 'var(--an-primary)', ...pos }} />
);

const OrgsPage: React.FC<Props> = ({ midnight }) => {
  const [submitted, setSubmitted] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    midnight.setPersona('org');
    setSubmitted(true);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      {/* decorative grid lines */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--an-outline-variant)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: 1, background: 'var(--an-outline-variant)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: 1, background: 'var(--an-outline-variant)', opacity: 0.5 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--an-stack-lg)', width: '100%', maxWidth: 1120, padding: 'var(--an-stack-lg) 0' }}>
        {/* Left: copy */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--an-stack-md)', borderRight: '1px solid var(--an-outline-variant)', paddingRight: 'var(--an-margin-safe)' }}>
          <div>
            <span className="an-label an-brutal" style={{ display: 'inline-block', padding: '4px 8px', background: 'var(--an-surface-high)', letterSpacing: '0.1em' }}>
              REGISTRATION INITIATION
            </span>
          </div>
          <h1 className="an-punchline" style={{ textTransform: 'uppercase' }}>
            PROTECT YOUR
            <br />
            <span style={{ borderBottom: '4px solid var(--an-primary)' }}>INFRASTRUCTURE</span>
          </h1>
          <p className="an-dense an-secondary-text" style={{ maxWidth: 420, borderLeft: '2px solid var(--an-outline-variant)', paddingLeft: 'var(--an-gutter)', margin: 0, padding: 'var(--an-unit) 0 var(--an-unit) var(--an-gutter)' }}>
            Engage with top-tier security researchers without unnecessary data exposure. The protocol dictates absolute confidentiality.
          </p>

          <div>
            <h3 className="an-label an-brutal-b" style={{ display: 'inline-block', paddingBottom: 'var(--an-unit)', marginBottom: 'var(--an-gutter)' }}>
              INITIATE CONTACT REGARDING:
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }} className="an-dense">
              {[
                'Products that combine advanced AI with human insights',
                'Dedicated customer success managers',
                'Expert, 24/7 triage coverage',
              ].map((t) => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ marginRight: 12 }}>-&gt;</span>
                  <span className="an-secondary-text">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="an-brutal" style={{ background: 'var(--an-surface-lowest)', padding: 'var(--an-gutter)', marginTop: 'var(--an-stack-sm)' }}>
            <div className="an-label" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>SYS.STAT: <span style={{ color: 'var(--an-primary)' }}>ONLINE</span></div>
              <div>ENCRYPTION: <span style={{ color: 'var(--an-primary)' }}>AES-256</span></div>
              <div>ROUTING: <span style={{ color: 'var(--an-primary)' }}>ANONYMIZED</span></div>
              <div className="an-dim" style={{ marginTop: 'var(--an-gutter)', opacity: 0.5 }}>AWAITING INPUT...</div>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="an-brutal" style={{ background: 'var(--an-surface-lowest)', padding: 'var(--an-margin-safe)', position: 'relative' }}>
            <Corner pos={{ top: -1, left: -1, borderTop: '1px solid', borderLeft: '1px solid' }} />
            <Corner pos={{ top: -1, right: -1, borderTop: '1px solid', borderRight: '1px solid' }} />
            <Corner pos={{ bottom: -1, left: -1, borderBottom: '1px solid', borderLeft: '1px solid' }} />
            <Corner pos={{ bottom: -1, right: -1, borderBottom: '1px solid', borderRight: '1px solid' }} />

            <div className="an-brutal-b" style={{ paddingBottom: 'var(--an-gutter)', marginBottom: 'var(--an-gutter)' }}>
              <p className="an-dense an-secondary-text" style={{ margin: 0, fontStyle: 'italic' }}>
                Our team typically responds within 1 business day. Data is encrypted in transit.
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: 'var(--an-stack-md) 0' }}>
                <p className="an-punchline an-accent-text">REQUEST LOGGED.</p>
                <p className="an-dense an-secondary-text" style={{ margin: 'var(--an-gutter) 0' }}>
                  NEXT STEP: CONNECT YOUR WALLET IN ORGANIZATION MODE TO POST YOUR FIRST PROGRAM.
                </p>
                <button onClick={() => navigate('/login-org')} className="an-btn" style={{ width: 'auto' }}>
                  CONNECT WALLET →
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="fn">FIRST NAME*</label>
                    <input id="fn" required style={inputStyle} />
                  </div>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="ln">LAST NAME*</label>
                    <input id="ln" required style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="em">BUSINESS EMAIL*</label>
                    <input id="em" type="email" required style={inputStyle} />
                  </div>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="co">COMPANY*</label>
                    <input id="co" required style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="jt">JOB TITLE*</label>
                    <input id="jt" required style={inputStyle} />
                  </div>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="rc">REASON FOR CONTACT*</label>
                    <select id="rc" required defaultValue="" style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option disabled value="">SELECT...</option>
                      <option value="vdp">Vulnerability Disclosure Program</option>
                      <option value="pt">Penetration Testing</option>
                      <option value="bb">Bug Bounty</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--an-gutter)' }}>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="ph">PHONE (OPTIONAL)</label>
                    <input id="ph" type="tel" style={inputStyle} />
                  </div>
                  <div>
                    <label className="an-label" style={fieldLabel} htmlFor="cn">COUNTRY*</label>
                    <select id="cn" required defaultValue="" style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option disabled value="">SELECT...</option>
                      {['United States', 'United Kingdom', 'Canada', 'Japan', 'Germany', 'France', 'Australia', 'Redacted / Other'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="an-dense an-dim" style={{ fontSize: 12, borderTop: '1px solid var(--an-outline-variant)', paddingTop: 'var(--an-gutter)', margin: 0 }}>
                  We will handle your contact details in line with our Privacy Policy. Your on-chain activity stays anonymous regardless — this form is for enterprise onboarding only.
                </p>

                <button
                  type="submit"
                  className="an-btn"
                  style={{ width: 'auto', justifyContent: 'space-between', flexDirection: 'row', padding: '16px 32px' }}
                >
                  SUBMIT <span className="msx">arrow_forward</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgsPage;
