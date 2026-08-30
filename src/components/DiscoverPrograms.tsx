import React, { useEffect, useMemo, useState } from 'react';
import type { useMidnight, BountyRow } from '../hooks/useMidnight';
import { navigate } from '../router';
import { listProgramMeta, type ProgramMeta, type PrizeRanges } from '../lib/programMeta';

type Props = { midnight: ReturnType<typeof useMidnight> };

const shortHex = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 5))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const SEVERITIES: Array<[keyof PrizeRanges, string]> = [
  ['low', 'LOW'],
  ['medium', 'MED'],
  ['high', 'HIGH'],
  ['critical', 'CRIT'],
];

const BountyCard: React.FC<{ b: BountyRow; meta?: ProgramMeta }> = ({ b, meta }) => (
  <div
    className="an-brutal"
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--an-gutter)',
      padding: 'var(--an-gutter)',
      background: 'var(--an-bg)',
      transition: 'background-color var(--an-fast) ease, transform var(--an-fast) var(--an-ease-out)',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-surface-high)')}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--an-bg)')}
  >
    <div className="an-brutal-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--an-unit)' }}>
      <span className="an-dense" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {meta?.entityName ? meta.entityName.toUpperCase() : `PROGRAM #${b.id.toString()}`}
      </span>
      <span className="msx an-dim">{b.status === 0 ? 'lock_open' : 'lock'}</span>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', flexGrow: 1 }}>
      {meta?.shortDescription && (
        <p className="an-dense an-secondary-text" style={{ margin: 0 }}>{meta.shortDescription}</p>
      )}
      <div>
        <span className="an-label an-secondary-text">ORG COMMITMENT</span>
        <div className="an-dense">0x{shortHex(b.org)}…</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)', marginTop: 'var(--an-unit)' }}>
        {meta?.scope && meta.scope.length > 0 && (
          <span className="an-chip" style={{ flexBasis: '100%' }}>
            <span className="an-label an-chip__key an-secondary-text">ASSETS IN SCOPE</span>
            <span className="an-dense an-chip__val" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
              {meta.scope.slice(0, 3).map((scope, index) => (
                <span key={`${scope.assetType}-${scope.target}-${index}`}>{scope.target || scope.assetType}</span>
              ))}
              {meta.scope.length > 3 && <span>+{meta.scope.length - 3} MORE…</span>}
            </span>
          </span>
        )}
        {meta?.prizeRanges && (
          <span className="an-chip" style={{ flexBasis: '100%' }}>
            <span className="an-label an-chip__key an-secondary-text">PRIZES BY SEVERITY</span>
            <span className="an-dense an-chip__val" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
              {SEVERITIES.map(([key, label]) => {
                const range = meta.prizeRanges[key];
                const value = range.min || range.max ? `${range.min || '—'}–${range.max || '—'} NIGHT` : '—';
                return <span key={key}>{label} {value}</span>;
              })}
            </span>
          </span>
        )}
      </div>
    </div>

    <button
      onClick={() => navigate(`/program/${b.id.toString()}`)}
      className="an-label"
      style={{
        width: '100%',
        padding: '10px 0',
        marginTop: 'var(--an-unit)',
        background: 'transparent',
        border: '1px solid var(--an-outline-variant)',
        color: 'var(--an-primary)',
        cursor: 'pointer',
        transition: 'background-color var(--an-fast) ease, color var(--an-fast) ease, transform 160ms var(--an-ease-out)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--an-primary)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      SEE DETAILS
    </button>
  </div>
);

const DiscoverPrograms: React.FC<Props> = ({ midnight }) => {
  const { bounties, boardStats, persona } = midnight;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [assetFilter, setAssetFilter] = useState('ANY');
  const [meta, setMeta] = useState<Map<bigint, ProgramMeta>>(new Map());

  const assetTypes = useMemo(() => {
    const types = new Set<string>();
    meta.forEach((program) => program.scope.forEach((scope) => types.add(scope.assetType)));
    return ['ANY', ...Array.from(types).sort()];
  }, [meta]);

  useEffect(() => {
    let cancelled = false;
    void listProgramMeta().then((rows) => {
      if (!cancelled) setMeta(new Map(rows.map((r) => [BigInt(r.bountyId), r])));
    });
    return () => {
      cancelled = true;
    };
  }, [bounties.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleBounties = persona === 'org' ? bounties : bounties.filter((b) => b.status === 0);
    return visibleBounties.filter((b) => {
      if (statusFilter === 'OPEN' && b.status !== 0) return false;
      if (statusFilter === 'CLOSED' && b.status !== 1) return false;
      if (assetFilter !== 'ANY' && !(meta.get(b.id)?.scope.some((scope) => scope.assetType === assetFilter))) return false;
      if (!q) return true;
      const m = meta.get(b.id);
      return (
        b.id.toString().includes(q) ||
        `program ${b.id}`.includes(q) ||
        `0x${shortHex(b.org)}`.includes(q) ||
        (m?.entityName.toLowerCase().includes(q) ?? false) ||
        (m?.shortDescription.toLowerCase().includes(q) ?? false)
      );
    });
  }, [bounties, persona, query, statusFilter, assetFilter, meta]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <h1 className="an-hook">DISCOVER PROGRAMS</h1>
        <p className="an-dense an-secondary-text" style={{ maxWidth: 640, marginTop: 'var(--an-stack-sm)' }}>
          WE HAVE {filtered.length} PROGRAM{filtered.length === 1 ? '' : 'S'} FOR YOU.
          {boardStats
            ? ` ${boardStats.totalPaid.toString()} NIGHT PAYOUTS RECORDED · ${boardStats.feesBurned.toString()} NIGHT SLOP FEES FORFEITED.`
            : ''}
        </p>
      </header>

      <div className="an-brutal" style={{ padding: 1, background: 'var(--an-outline-variant)' }}>
        <div className="discover-filters">
          <div>
            <label className="an-label an-secondary-text" htmlFor="q">&gt;_ QUERY</label>
            <input
              id="q"
              className="an-input"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--an-outline-variant)', minHeight: 42 }}
              placeholder="Search program ids or commitments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="an-label an-secondary-text" htmlFor="st">STATUS</label>
            <select id="st" className="an-input discover-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="ALL">ANY</option>
              <option value="OPEN">OPEN</option>
              {persona === 'org' && <option value="CLOSED">CLOSED</option>}
            </select>
          </div>
          <div>
            <label className="an-label an-secondary-text" htmlFor="asset-filter">ASSET TYPE</label>
            <select id="asset-filter" className="an-input discover-select" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
              {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
      </div>

      {midnight.persona === 'org' && (
        <a href="#/create" className="an-btn" style={{ width: 'auto', alignSelf: 'flex-start' }}>
          + POST A BOUNTY
        </a>
      )}

      {filtered.length === 0 ? (
        <div className="an-brutal" style={{ padding: 'var(--an-stack-lg)', textAlign: 'center' }}>
          <p className="an-punchline an-secondary-text">NO PROGRAMS MATCH.</p>
          <p className="an-label an-dim" style={{ marginTop: 'var(--an-gutter)' }}>
            BE THE FIRST — POST AN ANONYMOUS BOUNTY AND LET THE HUNTERS COME.
          </p>
        </div>
      ) : (
        <div className="an-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--an-gutter)', marginTop: 'var(--an-stack-md)' }}>
          {filtered.map((b) => (
            <BountyCard key={b.id.toString()} b={b} meta={meta.get(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoverPrograms;
