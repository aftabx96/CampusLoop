import { motion } from 'framer-motion';
import { Activity, Boxes, CalendarCheck, HandHeart, Hourglass, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Page, Spinner, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useUi } from '../stores/ui';

const COLORS = ['#3d6ef7', '#7c5cfc', '#22b8cf', '#2f9e6e', '#d97706', '#e5484d', '#e561b8', '#64748b'];

const tooltipStyle = {
  background: 'var(--glass-strong)', border: '1px solid var(--glass-border)',
  borderRadius: 14, backdropFilter: 'blur(20px)', fontSize: 13, color: 'var(--ink)',
};

export default function AdminDashboard() {
  const { toast } = useUi();
  const [overview, setOverview] = useState<any>(null);
  const [utilisation, setUtilisation] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<'department' | 'category' | 'faculty'>('department');
  const [demand, setDemand] = useState<any>(null);
  const [turnaround, setTurnaround] = useState<any[]>([]);
  const [lending, setLending] = useState<any>(null);
  const [anomaly, setAnomaly] = useState<any>(null);
  const [scanBusy, setScanBusy] = useState(false);

  useEffect(() => {
    api.get('/analytics/overview').then(({ data }) => setOverview(data)).catch(() => {});
    api.get('/analytics/demand').then(({ data }) => setDemand(data)).catch(() => {});
    api.get('/analytics/turnaround').then(({ data }) => setTurnaround(data)).catch(() => {});
    api.get('/analytics/lending').then(({ data }) => setLending(data)).catch(() => {});
    api.get('/analytics/anomaly-report').then(({ data }) => setAnomaly(data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/analytics/utilisation', { params: { groupBy } }).then(({ data }) => setUtilisation(data)).catch(() => {});
  }, [groupBy]);

  const runScan = async () => {
    setScanBusy(true);
    try {
      const { data } = await api.post('/analytics/anomaly-report/run');
      setAnomaly(data);
      toast('success', 'Anomaly scan complete');
    } catch (err) { toast('error', errMsg(err)); } finally { setScanBusy(false); }
  };

  const stats = overview ? [
    { icon: <Boxes size={20} />, label: 'Catalogued assets', value: overview.assets },
    { icon: <CalendarCheck size={20} />, label: 'Total bookings', value: overview.bookings },
    { icon: <Hourglass size={20} />, label: 'Pending approvals', value: overview.pendingApprovals },
    { icon: <HandHeart size={20} />, label: 'Peer loans', value: overview.peerLoans },
  ] : [];

  return (
    <Page>
      <div className="page">
        <div className="container">
          <h1 className="page-title">University Analytics</h1>
          <p className="page-sub">Utilisation, demand, turnaround and lending across all faculties.</p>

          {!overview ? <Spinner label="Loading analytics…" /> : (
            <motion.div variants={stagger} initial="hidden" animate="show">
              {/* stat tiles */}
              <div className="grid grid-4" style={{ marginBottom: 24 }}>
                {stats.map((s) => (
                  <motion.div key={s.label} variants={fadeUp} className="glass" style={{ padding: 22, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ padding: 12, borderRadius: 14, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>{s.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{s.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', marginBottom: 24 }}>
                {/* Chart 1: bar — utilisation */}
                <motion.div variants={fadeUp} className="glass" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <h3 style={{ fontSize: 16 }}>Utilisation rate (%)</h3>
                    <select className="input" style={{ minHeight: 36, fontSize: 13, padding: '4px 12px' }} value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} aria-label="Group utilisation by">
                      <option value="department">By department</option>
                      <option value="category">By category</option>
                      <option value="faculty">By faculty</option>
                    </select>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={utilisation} margin={{ left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink-3) 22%, transparent)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} interval={0} angle={-16} height={54} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ink-2)' }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'color-mix(in srgb, var(--accent) 8%, transparent)' }} />
                      <Bar dataKey="utilisationRate" name="Utilisation %" radius={[8, 8, 0, 0]}>
                        {utilisation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Chart 2: pie — demand split */}
                <motion.div variants={fadeUp} className="glass" style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 14 }}>Most-requested assets</h3>
                  {demand?.mostRequested?.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={demand.mostRequested} dataKey="bookings" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                          {demand.mostRequested.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p style={{ color: 'var(--ink-3)', fontSize: 13, padding: 30, textAlign: 'center' }}>No booking data yet.</p>}
                </motion.div>

                {/* Chart 3: area — lending volume over time */}
                <motion.div variants={fadeUp} className="glass" style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>Peer lending volume</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 12 }}>
                    Dispute rate: <strong style={{ color: 'var(--ink)' }}>{lending?.disputeRate ?? 0}%</strong> · overdue: {lending?.overdue ?? 0}
                  </p>
                  {lending?.byMonth?.length ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={lending.byMonth} margin={{ left: -22 }}>
                        <defs>
                          <linearGradient id="lendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink-3) 22%, transparent)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-2)' }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="loans" name="Loans" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#lendGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p style={{ color: 'var(--ink-3)', fontSize: 13, padding: 30, textAlign: 'center' }}>No loans yet.</p>}
                </motion.div>

                {/* Chart 4: radial — approval turnaround per manager */}
                <motion.div variants={fadeUp} className="glass" style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 14 }}>Approval turnaround (avg hours)</h3>
                  {turnaround.length ? (
                    <ResponsiveContainer width="100%" height={230}>
                      <RadialBarChart data={turnaround.map((t, i) => ({ ...t, avgHours: Math.round(Number(t.avgHours) * 10) / 10, fill: COLORS[i % COLORS.length] }))}
                        innerRadius="24%" outerRadius="95%" startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="avgHours" background={{ fill: 'color-mix(in srgb, var(--ink-3) 12%, transparent)' }} cornerRadius={8} label={{ fill: 'var(--ink)', fontSize: 11, position: 'insideStart' }} />
                        <Legend formatter={(_, entry: any) => `${entry?.payload?.manager} — ${entry?.payload?.avgHours}h`} wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} h`, 'Avg turnaround']} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  ) : <p style={{ color: 'var(--ink-3)', fontSize: 13, padding: 30, textAlign: 'center' }}>No decided bookings yet.</p>}
                </motion.div>
              </div>

              {/* AI Feature 4 (bonus) */}
              <motion.div variants={fadeUp} className="glass-strong" style={{ padding: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={17} color="var(--accent-2)" /> Utilisation Anomaly Detector
                    <span className="chip brand">AI Feature 4 · weekly cron</span>
                  </h3>
                  <button className="btn btn-glass btn-sm" onClick={runScan} disabled={scanBusy}>
                    <Play size={14} /> {scanBusy ? 'Scanning…' : 'Run scan now'}
                  </button>
                </div>
                {anomaly?.summary ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, marginBottom: 16 }}>{anomaly.summary}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                      <div>
                        <h4 style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 8 }}>BOTTLENECKS (over-booked)</h4>
                        {(anomaly.bottlenecks ?? []).map((b: any) => (
                          <div key={b.assetId} className="glass" style={{ padding: 12, marginBottom: 8, fontSize: 13 }}>
                            <strong>{b.name}</strong><p style={{ color: 'var(--ink-2)', marginTop: 3 }}>{b.recommendation}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 style={{ fontSize: 13, color: 'var(--warning)', marginBottom: 8 }}>IDLE (reallocation candidates)</h4>
                        {(anomaly.idle ?? []).map((b: any) => (
                          <div key={b.assetId} className="glass" style={{ padding: 12, marginBottom: 8, fontSize: 13 }}>
                            <strong>{b.name}</strong><p style={{ color: 'var(--ink-2)', marginTop: 3 }}>{b.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
                      <Activity size={12} style={{ verticalAlign: -2 }} /> Generated {anomaly.generatedAt ? new Date(anomaly.generatedAt).toLocaleString() : 'recently'} — emailed to faculty admins every Monday 08:00.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>
                    No weekly report yet. The NestJS cron runs every Monday at 08:00, analysing 8 weeks of booking
                    data per asset — or run it now for the demo. (Requires an AI API key; degrades gracefully otherwise.)
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </Page>
  );
}
