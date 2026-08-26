import React, { useMemo, useState } from 'react';
import type { useMidnight, BountyRow } from '../hooks/useMidnight';
import { navigate } from '../router';

type Props = { midnight: ReturnType<typeof useMidnight> };

const shortHex = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 5))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const BountyCard: React.FC<{ b: BountyRow; submissions: number }> = ({ b, submissions }) => (
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
        PROGRAM #{b.id.toString()}
      </span>
      <span className="msx an-dim">{b.status === 0 ? 'lock_open' : 'lock'}</span>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-sm)', flexGrow: 1 }}>
      <div>
        <span className="an-label an-secondary-text">ORG COMMITMENT</span>
        <div className="an-dense">0x{shortHex(b.org)}…</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--an-unit)', marginTop: 'var(--an-unit)' }}>
        <span className="an-chip">
          <span className="an-label an-chip__key an-secondary-text">AMOUNT</span>
          <span className="an-dense an-chip__val an-accent-text" style={{ fontWeight: 600 }}>{b.amount.toString()} CR</span>
        </span>
        <span className="an-chip">
          <span className="an-label an-chip__key an-secondary-text">DEADLINE</span>
          <span className="an-dense an-chip__val">{b.deadline.toString()}</span>
        </span>
        <span className="an-chip">
          <span className="an-label an-chip__key an-secondary-text">REPORTS</span>
          <span className="an-dense an-chip__val">{submissions}</span>
        </span>
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
  const { bounties, submissions, boardStats } = midnight;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const subCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of submissions) {
      const k = s.bountyId.toString();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bounties.filter((b) => {
      if (statusFilter === 'OPEN' && b.status !== 0) return false;
      if (statusFilter === 'CLOSED' && b.status !== 1) return false;
      if (!q) return true;
      return (
        b.id.toString().includes(q) ||
        `program ${b.id}`.includes(q) ||
        Array.from(b.org.slice(0, 6)).some(() => false) ||
        `0x${shortHex(b.org)}`.includes(q)
      );
    });
  }, [bounties, query, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--an-stack-md)' }}>
      <header className="an-brutal-b" style={{ paddingBottom: 'var(--an-stack-md)' }}>
        <h1 className="an-hook">DISCOVER PROGRAMS</h1>
        <p className="an-dense an-secondary-text" style={{ maxWidth: 640, marginTop: 'var(--an-stack-sm)' }}>
          WE HAVE {filtered.length} PROGRAM{filtered.length === 1 ? '' : 'S'} FOR YOU.
          {boardStats
            ? ` ${boardStats.totalPaid.toString()} CREDITS PAID OUT · ${boardStats.feesBurned.toString()} SLOP FEES BURNED.`
            : ''}
        </p>
      </header>

      <div className="an-brutal" style={{ padding: 1, background: 'var(--an-outline-variant)' }}>
        <div style={{ background: 'var(--an-bg)', padding: 'var(--an-gutter)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
          <div>
            <label className="an-label an-secondary-text" htmlFor="q">&gt;_ QUERY</label>
            <input
              id="q"
              className="an-input"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--an-outline-variant)' }}
              placeholder="Search program ids or commitments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="an-label an-secondary-text" htmlFor="st">STATUS</label>
            <select id="st" className="an-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="ALL">ANY</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
      </div>

      <a href="#/create" className="an-btn" style={{ width: 'auto', alignSelf: 'flex-start' }}>
        + POST A BOUNTY
      </a>

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
            <BountyCard key={b.id.toString()} b={b} submissions={subCount.get(b.id.toString()) ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoverPrograms;
