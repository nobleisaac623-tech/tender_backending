import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, Shield, Clock, Users, Activity } from 'lucide-react';
import api from '../../services/api';

// ── Action color map ─────────────────────────────────────────────
const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  login:           { bg: '#dbeafe', text: '#1e40af', label: 'Login'        },
  logout:          { bg: '#f1f5f9', text: '#475569', label: 'Logout'       },
  register:        { bg: '#dcfce7', text: '#166534', label: 'Register'     },
  approved:        { bg: '#dcfce7', text: '#166534', label: 'Approved'     },
  rejected:        { bg: '#fee2e2', text: '#991b1b', label: 'Rejected'     },
  suspended:       { bg: '#fef3c7', text: '#92400e', label: 'Suspended'    },
  blacklisted:     { bg: '#fee2e2', text: '#991b1b', label: 'Blacklisted'  },
  created:         { bg: '#ede9fe', text: '#5b21b6', label: 'Created'      },
  updated:         { bg: '#dbeafe', text: '#1e40af', label: 'Updated'      },
  deleted:         { bg: '#fee2e2', text: '#991b1b', label: 'Deleted'      },
  submitted:       { bg: '#dcfce7', text: '#166534', label: 'Submitted'    },
  awarded:         { bg: '#fef3c7', text: '#92400e', label: 'Awarded'      },
  signed:          { bg: '#dcfce7', text: '#166534', label: 'Signed'       },
  uploaded:        { bg: '#ede9fe', text: '#5b21b6', label: 'Uploaded'     },
  ai_request:      { bg: '#f0f9ff', text: '#0369a1', label: 'AI Request'   },
  password_reset:  { bg: '#fef3c7', text: '#92400e', label: 'Pwd Reset'    },
};

// ── Entity icon map ──────────────────────────────────────────────
const ENTITY_ICONS: Record<string, string> = {
  auth:     '🔐',
  tender:   '📋',
  bid:      '📨',
  supplier: '🏢',
  contract: '📄',
  user:     '👤',
  report:   '📊',
  chat:     '🤖',
  upload:   '📁',
  milestone:'🎯',
};

// ── Role badge ───────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:     { bg: '#fee2e2', text: '#991b1b' },
  supplier:  { bg: '#dcfce7', text: '#166534' },
  evaluator: { bg: '#ede9fe', text: '#5b21b6' },
};

// ── Time ago helper ──────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return `${diff}s ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Full timestamp ───────────────────────────────────────────────
function fullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function AdminAuditLog() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [actions, setActions]   = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);

  // Filters
  const [search,   setSearch]   = useState('');
  const [action,   setAction]   = useState('');
  const [entity,   setEntity]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:        String(page),
        limit:       '20',
        ...(search   && { search }),
        ...(action   && { action }),
        ...(entity   && { entity_type: entity }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to: dateTo }),
      });
      const res = await api.get(`/audit/list.php?${params}`);
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
      setPages(res.data.data.pages);
      setActions(res.data.data.actions);
      setEntities(res.data.data.entities);
    } finally {
      setLoading(false);
    }
  }, [page, search, action, entity, dateFrom, dateTo]);

  const fetchStats = async () => {
    const res = await api.get('/audit/stats.php');
    setStats(res.data.data);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, action, entity, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(''); setAction(''); setEntity('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = search || action || entity || dateFrom || dateTo;

  const exportCSV = () => {
    const rows = [
      ['Time', 'User', 'Email', 'Role', 'Action', 'Entity', 'Entity ID', 'Details'],
      ...logs.map(l => [
        fullTime(l.created_at), l.user_name || 'System',
        l.user_email || '', l.user_role || '',
        l.action, l.entity_type || '', l.entity_id || '', l.details || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Audit Log</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
            Complete record of all system activity
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchLogs} style={btnOutlineStyle}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCSV} style={btnPrimaryStyle}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Events Today',  value: stats.total_today,  icon: <Clock size={20} />,    color: '#2563eb', bg: '#eff6ff' },
            { label: 'This Week',     value: stats.total_week,   icon: <Activity size={20} />, color: '#10b981', bg: '#ecfdf5' },
            { label: 'This Month',    value: stats.total_month,  icon: <Shield size={20} />,   color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Active Users',  value: stats.unique_users, icon: <Users size={20} />,    color: '#f59e0b', bg: '#fffbeb' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{Number(card.value).toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user, action, details..."
            style={{ width: '100%', paddingLeft: '34px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', color: '#334155' }}
          />
        </div>

        {/* Action filter */}
        <select value={action} onChange={e => setAction(e.target.value)} style={selectStyle}>
          <option value="">All Actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{ACTION_COLORS[a]?.label || a}</option>
          ))}
        </select>

        {/* Entity filter */}
        <select value={entity} onChange={e => setEntity(e.target.value)} style={selectStyle}>
          <option value="">All Entities</option>
          {entities.map(e => (
            <option key={e} value={e}>{ENTITY_ICONS[e] || '•'} {e}</option>
          ))}
        </select>

        {/* Date range */}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={selectStyle} title="From date" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={selectStyle} title="To date" />

        {hasFilters && (
          <button onClick={clearFilters} style={{ ...btnOutlineStyle, color: '#ef4444', borderColor: '#fecaca' }}>
            ✕ Clear
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#94a3b8' }}>
          {total.toLocaleString()} records
        </div>
      </div>

      {/* ── Log Table ── */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Time', 'User', 'Role', 'Action', 'Entity', 'Details'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: '14px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '6px', width: j === 5 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No audit entries found</div>
                  <div style={{ fontSize: '12px' }}>Try adjusting your filters</div>
                </td>
              </tr>
            ) : logs.map((log, i) => {
              const actionStyle = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#475569', label: log.action };
              const roleStyle   = ROLE_COLORS[log.user_role] || { bg: '#f1f5f9', text: '#475569' };
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  {/* Time */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{timeAgo(log.created_at)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{fullTime(log.created_at)}</div>
                  </td>

                  {/* User */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {(log.user_name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{log.user_name || 'System'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.user_email || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '14px 16px' }}>
                    {log.user_role ? (
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: roleStyle.bg, color: roleStyle.text }}>
                        {log.user_role}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: actionStyle.bg, color: actionStyle.text }}>
                      {actionStyle.label}
                    </span>
                  </td>

                  {/* Entity */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    {log.entity_type ? (
                      <div>
                        <span style={{ fontSize: '13px' }}>{ENTITY_ICONS[log.entity_type] || '•'}</span>
                        <span style={{ marginLeft: '6px', color: '#475569', fontWeight: 500 }}>{log.entity_type}</span>
                        {log.entity_id && (
                          <span style={{ marginLeft: '4px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>#{log.entity_id}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>

                  {/* Details */}
                  <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details || ''}>
                      {log.details || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()} entries
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>← Prev</button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > pages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} style={pageBtnStyle(false, p === page)}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={pageBtnStyle(page === pages)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

// ── Shared inline styles ─────────────────────────────────────────
const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '9px 16px', borderRadius: '10px', fontSize: '13px',
  fontWeight: 600, cursor: 'pointer', border: 'none',
  background: '#2563eb', color: 'white', fontFamily: 'inherit',
};
const btnOutlineStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '9px 16px', borderRadius: '10px', fontSize: '13px',
  fontWeight: 600, cursor: 'pointer',
  background: 'white', color: '#475569',
  border: '1.5px solid #e2e8f0', fontFamily: 'inherit',
};
const selectStyle: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', fontSize: '13px', outline: 'none',
  color: '#334155', background: 'white', cursor: 'pointer', fontFamily: 'inherit',
};
const pageBtnStyle = (disabled: boolean, active = false): React.CSSProperties => ({
  padding: '7px 12px', borderRadius: '8px', fontSize: '13px',
  fontWeight: active ? 700 : 500, cursor: disabled ? 'default' : 'pointer',
  border: active ? 'none' : '1.5px solid #e2e8f0',
  background: active ? '#2563eb' : disabled ? '#f8fafc' : 'white',
  color: active ? 'white' : disabled ? '#cbd5e1' : '#475569',
  fontFamily: 'inherit',
});
