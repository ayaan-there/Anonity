import React from 'react';
import type { ProgramFormSeed, ScopeRow, PrizeRanges, PrizeRange } from '../lib/programMeta';

export type ProgramFormValues = ProgramFormSeed;

type Props = {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  initial: ProgramFormValues;
  submitLabel: string;
  busyLabel: string;
  statusLine: React.ReactNode;
  busy: boolean;
  error: string | null;
  requirePrizeRanges?: boolean;
  onSubmit: (values: ProgramFormValues) => void;
  onCancel?: () => void;
};

const HIGHLIGHTS: { key: string; title: string; blurb: string }[] = [
  { key: 'FAST_PAYMENT', title: 'FAST_PAYMENT', blurb: 'Bounties processed within 72 hours of triage.' },
  { key: 'OPEN_SCOPE', title: 'OPEN_SCOPE', blurb: 'All owned assets are implicitly in scope.' },
  { key: 'SAFE_HARBOR', title: 'SAFE_HARBOR', blurb: 'Gold standard legal protection for researchers.' },
  { key: 'EFFICIENT_TRIAGE', title: 'EFFICIENT_TRIAGE', blurb: 'Average initial response time under 24 hours.' },
];

const ASSET_TYPES = ['WILDCARD', 'URL', 'API', 'MOBILE_APP'];
const CVSS_VERSIONS = ['CVSS v3.1', 'CVSS v3.0', 'CVSS v4.0'];

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--an-unit)' };
const L = 'an-label an-secondary-text';

const ProgramForm: React.FC<Props> = ({
  eyebrow,
  title,
  initial,
  submitLabel,
  busyLabel,
  statusLine,
  busy,
  error,
  requirePrizeRanges = false,
  onSubmit,
  onCancel,
}) => {
  const [v, setV] = React.useState<ProgramFormValues>(initial);
  React.useEffect(() => setV(initial), [initial]);

  const set = <K extends keyof ProgramFormValues>(key: K, value: ProgramFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const setScope = (i: number, patch: Partial<ScopeRow>) =>
    setV((prev) => ({
      ...prev,
      scope: prev.scope.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const setPrize = (severity: keyof PrizeRanges, key: keyof PrizeRange, value: string) =>
    setV((prev) => ({
      ...prev,
      prizeRanges: {
        ...prev.prizeRanges,
        [severity]: { ...prev.prizeRanges[severity], [key]: value },
      },
    }));
  const addScopeRow = () =>
    setV((prev) => ({ ...prev, scope: [...prev.scope, { assetType: 'URL', target: '', maxBounty: '' }] }));
  const removeScopeRow = (i: number) =>
    setV((prev) => ({ ...prev, scope: prev.scope.filter((_, j) => j !== i) }));

  const toggleHighlight = (key: string) =>
    setV((prev) => ({
      ...prev,
      highlights: prev.highlights.includes(key)
        ? prev.highlights.filter((h) => h !== key)
        : [...prev.highlights, key],
    }));

  const prizeRangeValues = Object.values(v.prizeRanges);
  const prizeRangesEmpty = prizeRangeValues.every((range) => !range.min && !range.max);
  const prizeRangesComplete = prizeRangeValues.every((range) => {
    const min = Number(range.min);
    const max = Number(range.max);
    return range.min.length > 0 && range.max.length > 0 && max >= min;
  });
  const valid = v.entityName.trim().length > 0 &&
    (prizeRangesComplete || (!requirePrizeRanges && prizeRangesEmpty));

  return (
    <>
      <header
        className="an-brutal-b"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', padding: 'var(--an-stack-md) 0', marginBottom: 'var(--an-stack-lg)' }}
      >
        <div className="an-dense an-secondary-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--an-primary)' }}>//</span>
          {eyebrow}
        </div>
        <h1 className="an-hook">{title}</h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) onSubmit(v);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-lg)' }}
      >
        {/* [01] OVERVIEW & IDENTITY */}
        <section className="an-section">
          <div className="an-section__tab">[01] OVERVIEW &amp; IDENTITY</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--an-gutter)',
              marginTop: 'var(--an-stack-sm)',
            }}
          >
            <div style={field}>
              <label className={L} htmlFor="pf-name">Entity_Name</label>
              <input
                id="pf-name"
                className="an-input"
                placeholder="e.g. Acme Corp Infrastructure"
                value={v.entityName}
                onChange={(e) => set('entityName', e.target.value)}
              />
            </div>
            <div style={{ ...field, flexGrow: 2, minWidth: 240 }}>
              <label className={L} htmlFor="pf-short">Short_Description</label>
              <input
                id="pf-short"
                className="an-input"
                placeholder="Brief summary of the organization and scope..."
                value={v.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
              />
            </div>
            <div style={field}>
              <label className={L} htmlFor="pf-cvss">CVSS_Version</label>
              <select
                id="pf-cvss"
                className="an-input"
                value={v.cvssVersion}
                onChange={(e) => set('cvssVersion', e.target.value)}
              >
                {CVSS_VERSIONS.map((c) => (
                  <option key={c} value={c} style={{ background: 'var(--an-bg)' }}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={field}>
            <label className={L} htmlFor="pf-policy">Policy_Introduction</label>
            <textarea
              id="pf-policy"
              className="an-input"
              rows={5}
              placeholder="Detailed introduction, rules of engagement, and general guidelines for researchers..."
              value={v.policy}
              onChange={(e) => set('policy', e.target.value)}
            />
          </div>
        </section>

        {/* [02] CAPABILITY HIGHLIGHTS */}
        <section className="an-section">
          <div className="an-section__tab">[02] CAPABILITY HIGHLIGHTS</div>
          <div className="an-checkgrid" style={{ marginTop: 'var(--an-stack-sm)' }}>
            {HIGHLIGHTS.map((h) => {
              const on = v.highlights.includes(h.key);
              const safe = h.key === 'SAFE_HARBOR';
              return (
                <button
                  key={h.key}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleHighlight(h.key)}
                  className={`an-checkcard${on ? ' an-checkcard--on' : ''}${safe ? ' an-checkcard--safe' : ''}`}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      className="an-dense"
                      style={{
                        textTransform: 'uppercase',
                        color: safe ? '#00cc66' : 'var(--an-primary)',
                        border: safe ? '1px solid rgba(0,204,102,0.4)' : 'none',
                        padding: safe ? '2px 4px' : 0,
                      }}
                    >
                      {h.title}
                    </span>
                    <span className="an-checkcard__box">
                      {on && (
                        <span className="msx" style={{ fontSize: 14, fontWeight: 700 }}>check</span>
                      )}
                    </span>
                  </span>
                  <span className="an-label an-secondary-text" style={{ textTransform: 'none', lineHeight: 1.5 }}>
                    {h.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* [03] IN-SCOPE ASSETS */}
        <section className="an-section">
          <div className="an-section__tab">[03] IN-SCOPE ASSETS</div>
          <div className="an-brutal" style={{ marginTop: 'var(--an-stack-sm)', background: 'var(--an-surface-lowest)', overflowX: 'auto' }}>
            <div
              className="an-dense"
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 160px 36px',
                gap: 'var(--an-gutter)',
                padding: 12,
                borderBottom: '1px solid var(--an-outline-variant)',
                background: 'var(--an-bg)',
                minWidth: 560,
              }}
            >
              <span className="an-label an-secondary-text">Asset_Type</span>
              <span className="an-label an-secondary-text">Target_Identifier</span>
              <span className="an-label an-secondary-text" style={{ textAlign: 'right' }}>Max_Payout (NIGHT)</span>
              <span />
            </div>
            {v.scope.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 160px 36px',
                  gap: 'var(--an-gutter)',
                  padding: 8,
                  alignItems: 'center',
                  borderBottom: i < v.scope.length - 1 ? '1px solid var(--an-outline-variant)' : 'none',
                  minWidth: 560,
                }}
              >
                <select
                  className="an-input"
                  style={{ background: 'transparent' }}
                  value={s.assetType}
                  onChange={(e) => setScope(i, { assetType: e.target.value })}
                  aria-label={`Asset type row ${i + 1}`}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t} style={{ background: 'var(--an-bg)' }}>{t}</option>
                  ))}
                </select>
                <input
                  className="an-input"
                  style={{ background: 'transparent' }}
                  placeholder="*.example.com"
                  value={s.target}
                  onChange={(e) => setScope(i, { target: e.target.value })}
                  aria-label={`Target identifier row ${i + 1}`}
                />
                <input
                  className="an-input"
                  style={{ background: 'transparent', textAlign: 'right', color: '#00ccff' }}
                  placeholder="0.0012"
                  inputMode="decimal"
                  value={s.maxBounty}
                  onChange={(e) => setScope(i, { maxBounty: e.target.value.replace(/[^0-9.]/g, '') })}
                  aria-label={`Max bounty row ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeScopeRow(i)}
                  disabled={v.scope.length <= 1}
                  aria-label={`Remove scope row ${i + 1}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--an-secondary)',
                    cursor: v.scope.length <= 1 ? 'not-allowed' : 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <span className="msx" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addScopeRow}
            className="an-dense"
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: '1px solid var(--an-primary)',
              color: 'var(--an-primary)',
              padding: '8px 16px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition:
                'background-color var(--an-fast) ease, color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--an-primary)';
              e.currentTarget.style.color = 'var(--an-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--an-primary)';
            }}
          >
            <span className="msx" style={{ fontSize: 16 }}>add</span>
            ADD_SCOPE_ROW
          </button>
        </section>

        {/* [04] EXCLUSIONS */}
        <section className="an-section">
          <div className="an-section__tab an-section__tab--critical">[04] EXCLUSIONS (OUT OF SCOPE)</div>
          <p className="an-label an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
            Define explicit domains, vulnerability types, or scenarios that will not be rewarded.
          </p>
          <textarea
            className="an-input"
            rows={5}
            style={{ color: '#ff4d4d' }}
            placeholder={'- Social Engineering (Phishing, Vishing)\n- Denial of Service (DoS/DDoS)\n- Third-party applications not owned by Entity'}
            value={v.exclusions}
            onChange={(e) => set('exclusions', e.target.value)}
          />
        </section>

        {/* [05] SEVERITY PRIZE RANGES */}
        <section className="an-section">
          <div className="an-section__tab">[05] SEVERITY PRIZE RANGES</div>
          <p className="an-label an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
            Set the public minimum and maximum reward for each vulnerability severity.
          </p>
          <div className="an-brutal" style={{ marginTop: 'var(--an-stack-sm)', background: 'var(--an-surface-lowest)', overflowX: 'auto' }}>
            <div className="an-dense" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 'var(--an-gutter)', padding: 12, borderBottom: '1px solid var(--an-outline-variant)', background: 'var(--an-bg)', minWidth: 420 }}>
              <span className="an-label an-secondary-text">SEVERITY</span>
              <span className="an-label an-secondary-text">MINIMUM (NIGHT)</span>
              <span className="an-label an-secondary-text">MAXIMUM (NIGHT)</span>
            </div>
            {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <div key={severity} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 'var(--an-gutter)', padding: 8, alignItems: 'center', minWidth: 420, borderBottom: severity !== 'critical' ? '1px solid var(--an-outline-variant)' : 'none' }}>
                <span className="an-label" style={{ color: severity === 'critical' ? '#ff4d4d' : severity === 'high' ? '#ff9900' : 'var(--an-primary)' }}>{severity.toUpperCase()}</span>
                <input className="an-input" inputMode="decimal" placeholder="0" value={v.prizeRanges[severity].min} onChange={(e) => setPrize(severity, 'min', e.target.value.replace(/[^0-9.]/g, ''))} aria-label={`${severity} minimum prize`} />
                <input className="an-input" inputMode="decimal" placeholder="0" value={v.prizeRanges[severity].max} onChange={(e) => setPrize(severity, 'max', e.target.value.replace(/[^0-9.]/g, ''))} aria-label={`${severity} maximum prize`} />
              </div>
            ))}
          </div>
        </section>

        {/* [06] ON-CHAIN COMMITMENT */}
        <section className="an-section">
          <div className="an-section__tab">[06] ON-CHAIN COMMITMENT</div>
          <p className="an-label an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>
            Only these two values are proven and stored on-chain. Everything above stays off-chain.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--an-gutter)',
            }}
          >
            <div style={field}>
              <p className="an-label an-secondary-text" style={{ margin: 0 }}>PAYOUTS ARE SET PER REPORT IN NIGHT AFTER TRIAGE.</p>
            </div>
            <div style={field}>
              <label className={L} htmlFor="pf-deadline">Deadline (Blocks / Epoch)</label>
              <input
                id="pf-deadline"
                className="an-input"
                inputMode="numeric"
                placeholder="999999"
                value={v.deadline}
                onChange={(e) => set('deadline', e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>
        </section>

        {/* REVIEW & PUBLISH */}
        <section
          style={{
            borderTop: '2px solid var(--an-primary)',
            paddingTop: 'var(--an-stack-lg)',
            marginTop: 'var(--an-stack-md)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--an-stack-md)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="an-dense" style={{ textTransform: 'uppercase' }}>{statusLine}</span>
            <span className="an-label an-secondary-text">
              Ensure all parameters align with organizational security posture before execution.
            </span>
            {error && (
              <span className="an-dense" style={{ color: 'var(--an-error)' }}>{error}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--an-gutter)', flexWrap: 'wrap' }}>
            {onCancel && (
              <button type="button" onClick={onCancel} className="an-btn an-btn--ghost" style={{ width: 'auto', padding: '12px 24px' }}>
                CANCEL
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !valid}
              style={{
                border: '2px solid var(--an-primary)',
                background: 'var(--an-primary)',
                color: 'var(--an-bg)',
                fontFamily: 'Geist, sans-serif',
                fontWeight: 900,
                fontSize: 24,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                padding: '16px 32px',
                cursor: busy || !valid ? 'not-allowed' : 'pointer',
                opacity: busy || !valid ? 0.5 : 1,
                transition: 'background-color var(--an-fast) ease, color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
              }}
              onMouseEnter={(e) => {
                if (busy) return;
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--an-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--an-primary)';
                e.currentTarget.style.color = 'var(--an-bg)';
              }}
            >
              {busy ? busyLabel : submitLabel}
            </button>
          </div>
        </section>
      </form>
    </>
  );
};

export default ProgramForm;
