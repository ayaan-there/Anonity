import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { getProgramMeta } from '../lib/programMeta';
import { insertReport } from '../lib/reports';
import { getOrCreateHunterSecretKey } from '../lib/hunter-identity';

type Props = { midnight: ReturnType<typeof useMidnight>; bountyId: bigint | null };

const WEAKNESSES = [
  'SQL Injection (SQLi)',
  'Cross-Site Scripting (XSS)',
  'Broken Access Control / IDOR',
  'Authentication / Session Flaw',
  'Server-Side Request Forgery (SSRF)',
  'Remote Code Execution (RCE)',
  'Privilege Escalation',
  'Information Disclosure',
  'Business Logic Error',
  'Cryptographic Weakness',
  'Other',
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff4d4d',
  HIGH: '#ff9900',
  MEDIUM: '#ffd400',
  LOW: '#00cc66',
  INFORMATIONAL: '#00ccff',
};

type CvssVersion = 'CVSS v4.0' | 'CVSS v3.1' | 'CVSS v3.0';
type CvssMetric = { key: string; label: string; options: Array<[string, string]> };

const impactMetric = (key: string): CvssMetric => ({
  key,
  label: `${key} Impact`,
  options: [['N', 'None'], ['L', 'Low'], ['H', 'High']],
});

const COMMON_METRICS: CvssMetric[] = [
  { key: 'AV', label: 'Attack Vector', options: [['N', 'Network'], ['A', 'Adjacent'], ['L', 'Local'], ['P', 'Physical']] },
  { key: 'AC', label: 'Attack Complexity', options: [['L', 'Low'], ['H', 'High']] },
  { key: 'PR', label: 'Privileges Required', options: [['N', 'None'], ['L', 'Low'], ['H', 'High']] },
  { key: 'UI', label: 'User Interaction', options: [['N', 'None'], ['R', 'Required']] },
];

const CVSS_METRICS: Record<CvssVersion, CvssMetric[]> = {
  'CVSS v4.0': [
    ...COMMON_METRICS.filter((m) => m.key !== 'UI'),
    { key: 'AT', label: 'Attack Requirements', options: [['N', 'None'], ['P', 'Present']] },
    { key: 'UI', label: 'User Interaction', options: [['N', 'None'], ['P', 'Passive'], ['A', 'Active']] },
    ...['VC', 'VI', 'VA', 'SC', 'SI', 'SA'].map(impactMetric),
  ],
  'CVSS v3.1': [
    ...COMMON_METRICS,
    { key: 'S', label: 'Scope', options: [['U', 'Unchanged'], ['C', 'Changed']] },
    ...['C', 'I', 'A'].map(impactMetric),
  ],
  'CVSS v3.0': [
    ...COMMON_METRICS,
    { key: 'S', label: 'Scope', options: [['U', 'Unchanged'], ['C', 'Changed']] },
    ...['C', 'I', 'A'].map(impactMetric),
  ],
};

const CVSS_DEFAULTS: Record<CvssVersion, Record<string, string>> = {
  'CVSS v4.0': { AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N', VC: 'N', VI: 'N', VA: 'N', SC: 'N', SI: 'N', SA: 'N' },
  'CVSS v3.1': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' },
  'CVSS v3.0': { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' },
};

const inferSeverity = (version: CvssVersion, metrics: Record<string, string>): string => {
  const impactKeys = version === 'CVSS v4.0' ? ['VC', 'VI', 'VA', 'SC', 'SI', 'SA'] : ['C', 'I', 'A'];
  const high = impactKeys.filter((key) => metrics[key] === 'H').length;
  const low = impactKeys.filter((key) => metrics[key] === 'L').length;
  if (high >= 2 || (high === 1 && metrics.AV === 'N' && metrics.AC === 'L')) return 'CRITICAL';
  if (high === 1 || low >= 2) return 'HIGH';
  if (low === 1) return 'MEDIUM';
  return 'LOW';
};

const DESCRIPTION_TEMPLATE = `## Summary:
[add summary of the vulnerability]

## Steps To Reproduce:
[add details for how we can reproduce the issue]

1. [add step]
2. [add step]
3. [add step]

## Supporting Material/References:
[list any additional material (e.g. screenshots, logs, etc.)]

* [attachment / reference]`;

const L = 'an-label an-secondary-text an-field-label';

const SubmitReport: React.FC<Props> = ({ midnight, bountyId }) => {
  const [selected, setSelected] = React.useState<string>(bountyId ? bountyId.toString() : '');
  const [asset, setAsset] = React.useState('');
  const [weakness, setWeakness] = React.useState('');
  const [severity, setSeverity] = React.useState('');
  const [cvssVersion, setCvssVersion] = React.useState<CvssVersion>('CVSS v3.1');
  const [cvssMetrics, setCvssMetrics] = React.useState<Record<string, string>>(CVSS_DEFAULTS['CVSS v3.1']);
  const [autoDetectSeverity, setAutoDetectSeverity] = React.useState(false);
  const [description, setDescription] = React.useState(DESCRIPTION_TEMPLATE);
  const [impact, setImpact] = React.useState('');
  const [programName, setProgramName] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const { submitReport, boardReady, bounties, persona, error, clearError } = midnight;

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 8000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  React.useEffect(() => {
    if (!selected) {
      setProgramName(null);
      return;
    }
    let cancelled = false;
    void getProgramMeta(BigInt(selected)).then((m) => {
      if (!cancelled) setProgramName(m?.entityName ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const openBounties = bounties.filter((b) => b.status === 0);
  const metricsComplete = CVSS_METRICS[cvssVersion].every((metric) => cvssMetrics[metric.key]);
  const detectedSeverity = inferSeverity(cvssVersion, cvssMetrics);
  const valid = selected && asset.trim() && weakness && description.trim().length > 0 && metricsComplete && (autoDetectSeverity || severity);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setFormError(null);
    setBusy(true);
    try {
      const meta = await getProgramMeta(BigInt(selected));
      if (!meta?.encryptionPublicKey) {
        setFormError('THIS PROGRAM IS NOT READY TO RECEIVE ENCRYPTED REPORTS. PLEASE CONTACT THE PROGRAM OWNER.');
        return;
      }
      const receipt = await submitReport(BigInt(selected));
      if (receipt === null) return;
      const stored = await insertReport(receipt.submissionId, receipt.txId, {
        bountyId: Number(selected),
        asset: asset.trim(),
        weakness,
        severity: autoDetectSeverity ? detectedSeverity : severity,
        cvssVersion,
        cvssVector: `${cvssVersion.replace('CVSS ', 'CVSS:')}/${CVSS_METRICS[cvssVersion].map((metric) => `${metric.key}:${cvssMetrics[metric.key]}`).join('/')}`,
        description,
        impact,
      }, meta.encryptionPublicKey, getOrCreateHunterSecretKey());
      if (!stored) return;
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <p className="an-punchline an-accent-text">REPORT SUBMITTED.</p>
        <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
          THE CHAIN RECORDED THE SUBMISSION. YOUR WRITE-UP WENT TO THE ORG — NEVER TO THE LEDGER.
        </p>
        <a href="#/programs" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-stack-md)' }}>
          BACK TO PROGRAMS
        </a>
      </div>
    );
  }

  if (persona !== 'hunter') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">SUBMIT REPORT</h1>
        <p className="an-punchline an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          {persona === 'org' ? 'ORGS RECEIVE REPORTS — HACKERS SEND THEM.' : 'LOGIN AS A HACKER TO SUBMIT.'}
        </p>
        <a href="#/login" className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>
          HACKER LOGIN
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <div className="an-brutal-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-stack-sm)', paddingBottom: 'var(--an-stack-sm)' }}>
        <span className="an-dense">
          <span className="an-dim">You are submitting a report to </span>
          <span style={{ color: 'var(--an-primary)', fontWeight: 600 }}>
            {programName ?? (selected ? `PROGRAM #${selected}` : '…')}
          </span>
        </span>
        <span className="an-dense an-dim" style={{ textTransform: 'uppercase' }}>
          SUBMISSION · FEE ESCROW
        </span>
      </div>

      <div className="an-brutal an-dense an-secondary-text" style={{ padding: 'var(--an-stack-sm)', background: 'var(--an-surface-low)' }}>
        Your report content below is delivered to the org off-chain only. If you haven't yet, review the program's scope, policy,
        and exclusions on its page first.
      </div>

      {!boardReady ? (
        <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
          <p className="an-punchline an-secondary-text">CONNECT YOUR WALLET TO SUBMIT ON-CHAIN.</p>
          <button onClick={() => midnight.connect()} className="an-btn" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>
            CONNECT WALLET
          </button>
          {(error || formError) && <p className="an-dense" style={{ color: 'var(--an-error)', marginTop: 'var(--an-gutter)' }}>{error || formError}</p>}
        </div>
      ) : openBounties.length === 0 ? (
        <p className="an-dense an-secondary-text">NO OPEN PROGRAMS RIGHT NOW. CHECK BACK SOON.</p>
      ) : (
        <form onSubmit={submit} className="an-brutal" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--an-stack-sm)', borderBottom: '1px solid var(--an-outline-variant)', background: 'var(--an-surface-container)' }}>
            <span className="an-dense" style={{ fontWeight: 700 }}>Report Intent</span>
            <span className="an-label an-dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="msx" style={{ fontSize: 14 }}>cloud_done</span>
              DRAFT — LOCAL ONLY
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--an-gutter)', padding: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-outline-variant)' }}>
            <div>
              <label className={L} htmlFor="r-program">Program</label>
              <select id="r-program" className="an-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Select...</option>
                {openBounties.map((b) => (
                  <option key={b.id.toString()} value={b.id.toString()} style={{ background: 'var(--an-bg)' }}>
                    PROGRAM #{b.id.toString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={L} htmlFor="r-asset">Asset</label>
              <input id="r-asset" className="an-input" placeholder="api.example.com or URL" value={asset} onChange={(e) => setAsset(e.target.value)} />
            </div>
            <div>
              <label className={L} htmlFor="r-weakness">Weakness</label>
              <select id="r-weakness" className="an-input" value={weakness} onChange={(e) => setWeakness(e.target.value)}>
                <option value="">Select...</option>
                {WEAKNESSES.map((w) => (
                  <option key={w} value={w} style={{ background: 'var(--an-bg)' }}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={L} htmlFor="r-cvss-version">CVSS Version</label>
              <select
                id="r-cvss-version"
                className="an-input"
                value={cvssVersion}
                onChange={(e) => {
                  const next = e.target.value as CvssVersion;
                  setCvssVersion(next);
                  setCvssMetrics(CVSS_DEFAULTS[next]);
                }}
              >
                <option value="CVSS v4.0">CVSS v4.0</option>
                <option value="CVSS v3.1">CVSS v3.1</option>
                <option value="CVSS v3.0">CVSS v3.0</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', padding: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-outline-variant)' }}>
            <div className={L}>CVSS Base Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--an-gutter)' }}>
              {CVSS_METRICS[cvssVersion].map((metric) => (
                <div key={metric.key}>
                  <label className="an-label an-dim" htmlFor={`r-cvss-${metric.key}`}>{metric.key} · {metric.label}</label>
                  <select
                    id={`r-cvss-${metric.key}`}
                    className="an-input"
                    value={cvssMetrics[metric.key] ?? ''}
                    onChange={(e) => setCvssMetrics((prev) => ({ ...prev, [metric.key]: e.target.value }))}
                  >
                    {metric.options.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--an-gutter)', padding: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-outline-variant)' }}>
            <div>
              <label className={L} htmlFor="r-severity">Severity</label>
              <select id="r-severity" className="an-input" value={severity} disabled={autoDetectSeverity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">Select severity...</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="an-dense" style={{ display: 'flex', alignItems: 'center', gap: 'var(--an-unit)', cursor: 'pointer', alignSelf: 'end', paddingBottom: 10 }}>
              <input type="checkbox" checked={autoDetectSeverity} onChange={(e) => setAutoDetectSeverity(e.target.checked)} />
              DETECT SEVERITY AUTOMATICALLY
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', padding: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-outline-variant)' }}>
            <label className={L} htmlFor="r-desc" style={{ margin: 0 }}>Description</label>
            <textarea
              id="r-desc"
              className="an-input"
              rows={14}
              spellCheck={false}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', padding: 'var(--an-stack-md)', borderBottom: '1px solid var(--an-outline-variant)' }}>
            <label className={L} htmlFor="r-impact" style={{ margin: 0 }}>Impact</label>
            <textarea
              id="r-impact"
              className="an-input"
              rows={4}
              spellCheck={false}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}
              placeholder="Describe the business and technical impact of this vulnerability..."
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-gutter)', padding: 'var(--an-stack-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {severity && (
                <span className="an-label" style={{ color: SEVERITY_COLORS[severity] ?? 'var(--an-secondary)' }}>
                  SEVERITY: {severity}
                </span>
              )}
              {autoDetectSeverity && (
                <span className="an-label" style={{ color: SEVERITY_COLORS[detectedSeverity] ?? 'var(--an-secondary)' }}>
                  AUTO SEVERITY: {detectedSeverity}
                </span>
              )}
              <span className="an-label an-dim">5 NIGHT ANTI-SPAM FEE → CONTRACT ESCROW. WALLET BALANCE + DUST REQUIRED.</span>
              {(error || formError) && <span className="an-dense" style={{ color: 'var(--an-error)' }}>{error || formError}</span>}
            </div>
            <button type="submit" disabled={busy || !valid} className="an-btn" style={{ width: 'auto', padding: '12px 24px' }}>
              {busy ? 'PROVING + SUBMITTING…' : 'SUBMIT ANONYMOUSLY'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SubmitReport;
