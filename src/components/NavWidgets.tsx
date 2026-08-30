import React, { useEffect, useRef, useState } from 'react';
import type { useMidnight, SubmissionRow } from '../hooks/useMidnight';
import { navigate } from '../router';

const OUTCOME_LABEL = ['PENDING', 'VALID — PAID', 'DUPLICATE — REFUNDED', 'SLOP — FORFEITED'];

/** Deterministic 1:1 square avatar derived from the wallet address. */
export const AvatarSquare: React.FC<{ address: string; size?: number }> = ({ address, size = 30 }) => {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 25% 40%), hsl(${(hue + 40) % 360} 20% 22%))`,
        border: '1px solid var(--an-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: size * 0.34,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {address.slice(-4, -2).toUpperCase()}
    </div>
  );
};

type BellItem = {
  key: string;
  label: string;
  outcome: number;
  bountyId: bigint;
};

export const NotificationBell: React.FC<{ midnight: ReturnType<typeof useMidnight> }> = ({ midnight }) => {
  const { submissions } = midnight;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const items: BellItem[] = React.useMemo(() => {
    const sorted = [...submissions].sort((a, b) => (a.id < b.id ? 1 : -1));
    return sorted.slice(0, 6).map((s: SubmissionRow) => ({
      key: s.id.toString(),
      label: `REPORT #${s.id.toString()} · PROGRAM #${s.bountyId.toString()}`,
      outcome: s.outcome,
      bountyId: s.bountyId,
    }));
  }, [submissions]);

  const pendingCount = submissions.filter((s) => s.outcome === 0).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          color: open ? 'var(--an-secondary)' : 'var(--an-primary)',
          cursor: 'pointer',
          fontSize: 20,
          padding: 2,
          display: 'flex',
        }}
      >
        <span className="msx">notifications</span>
        {pendingCount > 0 && (
          <span
            className="an-label"
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              background: 'var(--an-accent)',
              color: 'var(--an-bg)',
              fontSize: 9,
              padding: '1px 4px',
              fontWeight: 700,
            }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      <div
        role="menu"
        className="an-brutal an-dense"
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 320,
          background: 'var(--an-surface-low)',
          zIndex: 100,
          padding: 'var(--an-gutter)',
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.97)',
          transformOrigin: 'top right',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 150ms var(--an-ease-out), transform 150ms var(--an-ease-out)',
        }}
      >
        <div className="an-label an-secondary-text" style={{ marginBottom: 'var(--an-unit)' }}>
          &gt;_ RECENT ACTIVITY
        </div>
        {items.length === 0 ? (
          <p className="an-dim" style={{ margin: 'var(--an-unit) 0 0' }}>
            QUIET. NO REPORTS ON THE BOARD YET.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((it, i) => (
              <li key={it.key} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--an-outline-variant)' }}>
                <a
                  href={`#/program/${it.bountyId.toString()}`}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '8px 0',
                    textDecoration: 'none',
                    transition: 'color var(--an-fast) ease',
                  }}
                >
                  <span className="an-label" style={{ color: 'var(--an-primary)' }}>{it.label}</span>
                  <span
                    className="an-label"
                    style={{
                      color:
                        it.outcome === 1
                          ? 'var(--an-accent)'
                          : it.outcome === 3
                            ? 'var(--an-error)'
                            : 'var(--an-on-surface-variant)',
                    }}
                  >
                    {OUTCOME_LABEL[it.outcome] ?? 'UNKNOWN'}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => {
            setOpen(false);
            navigate('/inbox');
          }}
          className="an-label"
          style={{
            marginTop: 'var(--an-unit)',
            paddingTop: 'var(--an-unit)',
            width: '100%',
            background: 'none',
            border: 'none',
            borderTop: '1px solid var(--an-outline-variant)',
            color: 'var(--an-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          OPEN FULL INBOX →
        </button>
      </div>
    </div>
  );
};
