import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, TrendingUp, FileText, Users, DollarSign, Award } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16'];

function formatGHS(val: number): string {
  if (val >= 1_000_000) return `GHS ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `GHS ${(val / 1_000).toFixed(0)}K`;
  return `GHS ${val.toLocaleString()}`;
}

export function AdminReports() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'overview' | 'tenders' | 'bids' | 'suppliers' | 'contracts'>('overview');

  useEffect(() => {
    api.get('/reports/summary.php')
      .then(res => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: '28px' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Reports</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
        {Array.from({length: 8}).map((_,i) => (
          <div key={i} style={{ height: '90px', borderRadius: '14px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  const { tenders, bids, suppliers, contracts } = data;

  // ── KPI cards ─────────────────────────────────────────────
  const kpis = [
    { label: 'Total Tenders',       value: tenders.total,         sub: `${tenders.open} open`,         icon: <FileText size={20}/>,   color: '#2563eb', bg: '#eff6ff' },
    { label: 'Total Bids',          value: bids.total,            sub: `${bids.avg_per_tender} avg/tender`, icon: <TrendingUp size={20}/>, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Active Suppliers',    value: suppliers.active,      sub: `${suppliers.pending} pending`, icon: <Users size={20}/>,      color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Active Contracts',    value: contracts.active,      sub: `${contracts.completed} completed`, icon: <Award size={20}/>,  color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Tender Pipeline',     value: formatGHS(Number(tenders.total_value)), sub: 'total budget value', icon: <DollarSign size={20}/>, color: '#06b6d4', bg: '#ecfeff', isText: true },
    { label: 'Contract Value',      value: formatGHS(Number(contracts.total_value)), sub: 'all contracts', icon: <DollarSign size={20}/>, color: '#ec4899', bg: '#fdf2f8', isText: true },
    { label: 'Bid Success Rate',    value: bids.total > 0 ? `${Math.round((bids.accepted / bids.total) * 100)}%` : '0%', sub: `${bids.accepted} accepted`, icon: <TrendingUp size={20}/>, color: '#10b981', bg: '#ecfdf5', isText: true },
    { label: 'Total Suppliers',     value: suppliers.total,       sub: `${suppliers.suspended} suspended`, icon: <Users size={20}/>, color: '#64748b', bg: '#f8fafc' },
  ];

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Reports & Analytics</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>System-wide performance overview</p>
        </div>
        <button style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'9px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', border:'none', background:'#2563eb', color:'white', fontFamily:'inherit' }}>
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '28px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:k.bg, color:k.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: k.isText ? '18px' : '26px', fontWeight:800, color:'#0f172a', lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'4px' }}>{k.label}</div>
              <div style={{ fontSize:'11px', color:'#cbd5e1', marginTop:'2px' }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'20px', background:'white', padding:'6px', borderRadius:'12px', border:'1px solid #e2e8f0', width:'fit-content' }}>
        {(['overview','tenders','bids','suppliers','contracts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background: tab===t ? '#2563eb' : 'transparent', color: tab===t ? 'white' : '#64748b', textTransform:'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

        {/* ── OVERVIEW / TENDERS ── */}
        {(tab === 'overview' || tab === 'tenders') && (
          <>
            {/* Tenders by status (pie) */}
            <div style={chartCardStyle}>
              <div style={chartTitleStyle}>Tenders by Status</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name:'Open',      value: tenders.open },
                    { name:'Draft',     value: tenders.draft },
                    { name:'Closed',    value: tenders.closed },
                    { name:'Awarded',   value: tenders.awarded },
                  ]} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({name,percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                    {COLORS.map((c,i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, 'Tenders']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tenders by category */}
            <div style={chartCardStyle}>
              <div style={chartTitleStyle}>Tenders by Category</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tenders.by_category} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[0,6,6,0]} name="Tenders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tender creation over time */}
            <div style={{ ...chartCardStyle, gridColumn: '1 / -1' }}>
              <div style={chartTitleStyle}>Tender & Bid Trends (Last 6 Months)</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" type="category" allowDuplicatedCategory={false} tick={{ fontSize:12 }} />
                  <YAxis tick={{ fontSize:12 }} />
                  <Tooltip />
                  <Legend />
                  <Line data={tenders.by_month} type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r:4 }} name="Tenders" />
                  <Line data={bids.by_month}    type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r:4 }} name="Bids" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── BIDS ── */}
        {(tab === 'overview' || tab === 'bids') && (
          <div style={chartCardStyle}>
            <div style={chartTitleStyle}>Bid Outcomes</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={[
                  { name:'Submitted',  value: Number(bids.submitted) },
                  { name:'Accepted',   value: Number(bids.accepted)  },
                  { name:'Rejected',   value: Number(bids.rejected)  },
                ]} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                  label={({name,percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  <Cell fill="#2563eb" />
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── SUPPLIERS ── */}
        {(tab === 'overview' || tab === 'suppliers') && (
          <>
            <div style={chartCardStyle}>
              <div style={chartTitleStyle}>Supplier Registrations (Last 6 Months)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={suppliers.by_month}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize:12 }} />
                  <YAxis tick={{ fontSize:12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6,6,0,0]} name="Registrations" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top bidders table */}
            <div style={chartCardStyle}>
              <div style={chartTitleStyle}>Top Suppliers by Bid Activity</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', marginTop:'8px' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <th style={thStyle}>Company</th>
                    <th style={thStyle}>Bids</th>
                    <th style={thStyle}>Wins</th>
                    <th style={thStyle}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.top_bidders.map((s: any, i: number) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}>
                      <td style={{ padding:'10px 8px', color:'#334155', fontWeight:500 }}>{s.company_name}</td>
                      <td style={{ padding:'10px 8px', color:'#64748b', textAlign:'center' }}>{s.bid_count}</td>
                      <td style={{ padding:'10px 8px', textAlign:'center' }}>
                        <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:600, background:'#dcfce7', color:'#166534' }}>{s.wins}</span>
                      </td>
                      <td style={{ padding:'10px 8px', textAlign:'center', color:'#64748b' }}>
                        {s.bid_count > 0 ? `${Math.round((s.wins/s.bid_count)*100)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── CONTRACTS ── */}
        {(tab === 'overview' || tab === 'contracts') && (
          <div style={chartCardStyle}>
            <div style={chartTitleStyle}>Contracts by Status</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={[
                  { name:'Draft',     value: Number(contracts.draft)     },
                  { name:'Active',    value: Number(contracts.active)    },
                  { name:'Completed', value: Number(contracts.completed) },
                ]} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                  label={({name,percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  <Cell fill="#94a3b8" />
                  <Cell fill="#2563eb" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}

const chartCardStyle: React.CSSProperties = {
  background:'white', borderRadius:'14px', padding:'20px',
  border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
};
const chartTitleStyle: React.CSSProperties = {
  fontSize:'14px', fontWeight:700, color:'#1e293b', marginBottom:'16px',
};
const thStyle: React.CSSProperties = {
  padding:'8px', textAlign:'left', fontSize:'11px', fontWeight:700,
  textTransform:'uppercase', letterSpacing:'0.06em', color:'#94a3b8',
};
