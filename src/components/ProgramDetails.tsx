import React from 'react';
import type { useMidnight } from '../hooks/useMidnight';
import { navigate } from '../router';
import { getProgramMeta, isProgramOwner, type ProgramMeta, type PrizeRanges } from '../lib/programMeta';
import { listReportsForBounty, type ReportContent } from '../lib/reports';

type Props = { midnight: ReturnType<typeof useMidnight>; id: bigint };

const shortHex = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const OUTCOME_LABEL = ['PENDING', 'VALID — PAID', 'DUPLICATE — REFUNDED', 'SLOP — FORFEITED'];

const HIGHLIGHT_LABELS: Record<string, string> = {
  FAST_PAYMENT: 'FAST PAYMENT',
  OPEN_SCOPE: 'OPEN SCOPE',
  SAFE_HARBOR: 'SAFE HARBOR',
  EFFICIENT_TRIAGE: 'EFFICIENT TRIAGE',
};

const SEVERITIES: Array<[keyof PrizeRanges, string]> = [
  ['low', 'LOW'],
  ['medium', 'MEDIUM'],
  ['high', 'HIGH'],
  ['critical', 'CRITICAL'],
];

const ProgramDetails: React.FC<Props> = ({ midnight, id }) => {
  const { bounties, submissions, boardReady, persona } = midnight;
  const bounty = bounties.find((b) => b.id === id);
  const [isOwner, setIsOwner] = React.useState(false);
  const canReview = persona === 'org' && isOwner;
  const subs = canReview ? submissions.filter((s) => s.bountyId === id) : [];
  const [meta, setMeta] = React.useState<ProgramMeta | null>(null);
  const [reports, setReports] = React.useState<Map<bigint, ReportContent>>(new Map());

  React.useEffect(() => {
    let cancelled = false;
    void getProgramMeta(id).then((m) => {
      if (!cancelled) setMeta(m);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    void isProgramOwner(id).then((owned) => {
      if (!cancelled) setIsOwner(owned);
    });
    return () => { cancelled = true; };
  }, [id, persona]);

  React.useEffect(() => {
    let cancelled = false;
    if (!canReview) {
      setReports(new Map());
      return () => { cancelled = true; };
    }
    void listReportsForBounty(id).then((rows) => {
      if (!cancelled) setReports(new Map(rows.map((r) => [BigInt(r.submissionId), r])));
    });
    return () => {
      cancelled = true;
    };
  }, [id, canReview, subs.length]);

  if (!bounty) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">PROGRAM #{id.toString()}</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          NOT FOUND OR STILL SYNCING. <a href="#/programs" className="an-accent-text">BACK TO PROGRAMS</a>
        </p>
      </div>
    );
  }

  if (bounty.status !== 0 && persona !== 'org') {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--an-stack-lg) 0' }}>
        <h1 className="an-hook">PROGRAM UNAVAILABLE</h1>
        <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-md)' }}>
          THIS PROGRAM IS NO LONGER ACCEPTING REPORTS.
        </p>
        <a href="#/programs" className="an-btn an-btn--ghost" style={{ width: 'auto', marginTop: 'var(--an-gutter)' }}>
          ← ALL PROGRAMS
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <p className="an-label an-secondary-text" style={{ margin: 0 }}>PROGRAM #{id.toString()}</p>
        <h1 className="an-hook" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
          {meta?.entityName ? meta.entityName.toUpperCase() : `#${id.toString()}`}
        </h1>
        {meta?.shortDescription && (
          <p className="an-dense an-secondary-text" style={{ marginTop: 'var(--an-stack-sm)' }}>{meta.shortDescription}</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)', marginTop: 'var(--an-gutter)' }}>
          {midnight.persona === 'org' && (
            <span className="an-chip">
              <span className="an-label an-chip__key an-secondary-text">DEADLINE</span>
              <span className="an-chip__val an-dense">{bounty.deadline.toString()}</span>
            </span>
          )}
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">STATUS</span>
            <span className="an-chip__val an-dense">{bounty.status === 0 ? 'OPEN' : 'CLOSED'}</span>
          </span>
          <span className="an-chip">
            <span className="an-label an-chip__key an-secondary-text">ORG</span>
            <span className="an-chip__val an-dense">0x{shortHex(bounty.org)}…</span>
          </span>
        </div>
      </header>

      {meta?.prizeRanges && (
        <section className="an-section">
          <div className="an-section__tab">PRIZES BY SEVERITY</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)', marginTop: 'var(--an-stack-sm)' }}>
            {SEVERITIES.map(([key, label]) => {
              const range = meta.prizeRanges[key];
              return (
                <span key={key} className="an-chip">
                  <span className="an-label an-chip__key an-secondary-text">{label}</span>
                  <span className="an-dense an-chip__val">{range.min || '—'}–{range.max || '—'} NIGHT</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {meta && (meta.policy || meta.scope.length > 0 || meta.exclusions) && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
          {meta.policy && (
            <div className="an-section">
              <div className="an-section__tab">POLICY</div>
              <p className="an-dense an-secondary-text" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{meta.policy}</p>
            </div>
          )}
          {meta.highlights.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)' }}>
              {meta.highlights.map((h) => (
                <span key={h} className="an-chip">
                  <span className="an-chip__val an-label an-accent-text">{HIGHLIGHT_LABELS[h] ?? h}</span>
                </span>
              ))}
            </div>
          )}
          {meta.scope.length > 0 && (
            <div className="an-section">
              <div className="an-section__tab">IN-SCOPE ASSETS</div>
              <div className="an-brutal" style={{ background: 'var(--an-surface-lowest)', overflowX: 'auto' }}>
                <div
                  className="an-dense"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 140px',
                    gap: 'var(--an-gutter)',
                    padding: 10,
                    borderBottom: '1px solid var(--an-outline-variant)',
                    minWidth: 480,
                  }}
                >
                  <span className="an-label an-secondary-text">Asset_Type</span>
                  <span className="an-label an-secondary-text">Target_Identifier</span>
                  <span className="an-label an-secondary-text" style={{ textAlign: 'right' }}>Max_Bounty</span>
                </div>
                {meta.scope.map((s, i) => (
                  <div
                    key={i}
                    className="an-dense"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 140px',
                      gap: 'var(--an-gutter)',
                      padding: 10,
                      borderBottom: i < meta.scope.length - 1 ? '1px solid var(--an-outline-variant)' : 'none',
                      minWidth: 480,
                    }}
                  >
                    <span>{s.assetType}</span>
                    <span style={{ wordBreak: 'break-all' }}>{s.target}</span>
                    <span style={{ textAlign: 'right', color: 'var(--an-accent)' }}>{s.maxBounty || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {meta.exclusions && (
            <div className="an-section">
              <div className="an-section__tab an-section__tab--critical">EXCLUSIONS</div>
              <p className="an-dense" style={{ whiteSpace: 'pre-wrap', color: '#ff8a80', margin: 0 }}>{meta.exclusions}</p>
            </div>
          )}
        </section>
      )}

      {canReview && <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--an-gutter)' }}>
          <h2 className="an-punchline">SUBMISSIONS ({subs.length})</h2>
        </div>

        {subs.length === 0 ? (
          <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
            <p className="an-dense an-secondary-text">NO REPORTS YET.</p>
            <p className="an-label an-dim" style={{ marginTop: 'var(--an-unit)' }}>
              HUNTERS ARE WATCHING. FIRST BLOOD GETS PAID.
            </p>
          </div>
        ) : (
          <div className="an-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-gutter)' }}>
            {subs.map((s) => {
              const report = reports.get(s.id);
              return (
                <div key={s.id.toString()} className="an-brutal" style={{ display: 'flex', flexDirection: 'column', background: 'var(--an-surface-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--an-unit)', padding: 'var(--an-gutter)', borderBottom: report && midnight.persona === 'org' ? '1px solid var(--an-outline-variant)' : 'none' }}>
                    <span className="an-label" style={{ color: s.outcome === 1 ? 'var(--an-accent)' : s.outcome === 3 ? 'var(--an-error)' : 'var(--an-primary)' }}>
                      SUB #{s.id.toString()} · {OUTCOME_LABEL[s.outcome] ?? `UNKNOWN (${s.outcome})`}
                    </span>
                    <span className="an-dense an-dim">0x{shortHex(s.hunter)}…</span>
                  </div>

                  {report && midnight.persona === 'org' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)', padding: 'var(--an-gutter)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)' }}>
                        <span className="an-chip">
                          <span className="an-label an-chip__key an-secondary-text">ASSET</span>
                          <span className="an-chip__val an-dense">{report.asset || '—'}</span>
                        </span>
                        <span className="an-chip">
                          <span className="an-label an-chip__key an-secondary-text">WEAKNESS</span>
                          <span className="an-chip__val an-dense">{report.weakness || '—'}</span>
                        </span>
                        <span className="an-chip">
                          <span className="an-label an-chip__key an-secondary-text">SEVERITY</span>
                          <span className="an-chip__val an-dense">{report.severity || 'NOT SET'}</span>
                        </span>
                      </div>
                      <div>
                        <div className="an-label an-secondary-text" style={{ marginBottom: 'var(--an-unit)' }}>DESCRIPTION</div>
                        <pre className="an-dense" style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 'var(--an-gutter)', background: 'var(--an-bg)', border: '1px solid var(--an-outline-variant)' }}>
                          {report.description}
                        </pre>
                      </div>
                      {report.impact && (
                        <div>
                          <div className="an-label an-secondary-text" style={{ marginBottom: 'var(--an-unit)' }}>IMPACT</div>
                          <pre className="an-dense" style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 'var(--an-gutter)', background: 'var(--an-bg)', border: '1px solid var(--an-outline-variant)' }}>
                            {report.impact}
                          </pre>
                        </div>
                      )}
                      {s.outcome === 0 && (
                        <button type="button" onClick={() => navigate(`/inbox/${s.id.toString()}`)} className="an-btn" style={{ width: 'auto', alignSelf: 'flex-start' }}>
                          OPEN INBOX TRIAGE →
                        </button>
                      )}
                    </div>
                  )}

                  {(!report || midnight.persona !== 'org') && s.outcome === 0 && midnight.persona === 'org' && (
                    <div style={{ padding: 'var(--an-gutter)', display: 'flex', flexDirection: 'column', gap: 'var(--an-unit)' }}>
                      <p className="an-label an-dim" style={{ margin: 0 }}>LEGACY SUBMISSION — CONTENT NOT ATTACHED (SUBMITTED BEFORE RICH REPORTS).</p>
                      <button type="button" onClick={() => navigate(`/inbox/${s.id.toString()}`)} className="an-btn" style={{ width: 'auto', alignSelf: 'flex-start' }}>OPEN INBOX TRIAGE →</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canReview && !boardReady && subs.some((s) => s.outcome === 0) && (
          <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
            CONNECT THE ORG WALLET TO OPEN INBOX TRIAGE.
          </p>
        )}
      </section>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--an-gutter)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/programs')} className="an-btn an-btn--ghost" style={{ width: 'auto' }}>
          ← ALL PROGRAMS
        </button>
        {persona === 'hunter' ? (
          bounty.status === 0 ? (
            <a href={`#/submit/${id.toString()}`} className="an-btn" style={{ width: 'auto', textDecoration: 'none' }}>
              PAY 5 NIGHT - SUBMIT REPORT
            </a>
          ) : (
            <button type="button" className="an-btn an-btn--ghost" disabled style={{ width: 'auto', opacity: 0.55, cursor: 'not-allowed' }} title="This program is closed">
              PROGRAM CLOSED
            </button>
          )
        ) : persona === null && bounty.status === 0 ? (
          <a href="#/login" className="an-label an-dim" style={{ textDecoration: 'none' }}>
            LOGIN AS HACKER TO SUBMIT →
          </a>
        ) : null}
      </div>
    </div>
  );
};

export default ProgramDetails;
