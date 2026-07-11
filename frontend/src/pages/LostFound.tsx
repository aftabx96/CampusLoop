import { motion } from 'framer-motion';
import { CheckCheck, MapPin, PackageSearch, Plus, SearchX, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Modal, Page, Spinner, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface LostReport { id: string; title: string; description: string; lastSeenLocation: string; status: string; createdAt: string; reporter?: { fullName: string } }
interface FoundItem { id: string; title: string; description: string; foundLocation: string; conditionNotes?: string; status: string; createdAt: string }
interface MatchPair { lostReportId: string; foundItemId: string; confidence: number; reason: string; lostReport: LostReport; foundItem: FoundItem }

const lfChip: Record<string, string> = { OPEN: 'warn', MATCHED: 'brand', CLAIMED: 'ok', RETURNED: 'ok', LOGGED: 'warn', DONATION_FLAGGED: 'bad', CLOSED: '' };

export default function LostFound() {
  const { user } = useAuth();
  const { toast } = useUi();
  const isOfficer = user?.role === 'LOST_FOUND_OFFICER' || user?.role === 'ADMIN';
  const [tab, setTab] = useState<'lost' | 'found' | 'matches'>('lost');
  const [lost, setLost] = useState<LostReport[]>([]);
  const [found, setFound] = useState<FoundItem[]>([]);
  const [matches, setMatches] = useState<{ aiRanked: boolean; pairs: MatchPair[] } | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const load = () => {
    api.get('/lost-found/lost', { params: { mine: !isOfficer } }).then(({ data }) => setLost(data)).catch(() => {});
    api.get('/lost-found/found').then(({ data }) => setFound(data)).catch(() => {});
  };
  useEffect(load, []);

  const loadMatches = async () => {
    setMatchesLoading(true);
    try {
      const { data } = await api.get('/lost-found/matches');
      setMatches(data);
    } catch (err) { toast('error', errMsg(err)); } finally { setMatchesLoading(false); }
  };

  const confirmMatch = async (p: MatchPair) => {
    try {
      await api.post('/lost-found/matches/confirm', { lostReportId: p.lostReportId, foundItemId: p.foundItemId });
      toast('success', 'Match confirmed - reporter notified');
      load(); loadMatches();
    } catch (err) { toast('error', errMsg(err)); }
  };

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 920 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
            <div>
              <h1 className="page-title">Lost & Found</h1>
              <p className="page-sub" style={{ marginBottom: 0 }}>
                {isOfficer ? 'Log found items and review AI-suggested matches.' : 'Report lost items - AI helps reunite them with you.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => setReportOpen(true)}><Plus size={16} /> Report lost item</button>
              {isOfficer && <button className="btn btn-glass" onClick={() => setLogOpen(true)}><PackageSearch size={16} /> Log found item</button>}
            </div>
          </div>

          <div className="glass" style={{ display: 'inline-flex', gap: 4, padding: 5, borderRadius: 999, marginBottom: 26 }}>
            {[
              { k: 'lost', label: `Lost reports (${lost.length})` },
              { k: 'found', label: `Found items (${found.length})` },
              ...(isOfficer ? [{ k: 'matches', label: 'AI Matches' }] : []),
            ].map((t: any) => (
              <button key={t.k} className="btn btn-sm" onClick={() => { setTab(t.k); if (t.k === 'matches' && !matches) loadMatches(); }}
                style={{
                  borderRadius: 999, border: 'none',
                  background: tab === t.k ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                  color: tab === t.k ? '#fff' : 'var(--ink-2)',
                }}>{t.label}</button>
            ))}
          </div>

          {tab === 'lost' && (
            lost.length === 0 ? <EmptyState icon={<SearchX size={26} />} title="No lost reports" /> : (
              <motion.div key="lost" variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lost.map((r) => (
                  <motion.div key={r.id} variants={fadeUp} className="glass" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <strong>{r.title}</strong>
                      <span className={`chip ${lfChip[r.status] ?? ''}`}>{r.status.toLowerCase().replace('_', ' ')}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 6 }}>{r.description}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 5, alignItems: 'center' }}>
                      <MapPin size={12} /> Last seen: {r.lastSeenLocation} · {new Date(r.createdAt).toLocaleDateString()}
                      {isOfficer && r.reporter && ` · by ${r.reporter.fullName}`}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )
          )}

          {tab === 'found' && (
            found.length === 0 ? <EmptyState icon={<PackageSearch size={26} />} title="No found items logged" /> : (
              <motion.div key="found" variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {found.map((f) => (
                  <motion.div key={f.id} variants={fadeUp} className="glass" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <strong>{f.title}</strong>
                      <span className={`chip ${lfChip[f.status] ?? ''}`}>{f.status.toLowerCase().replace(/_/g, ' ')}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 6 }}>{f.description}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <MapPin size={12} /> Found at: {f.foundLocation}
                      {f.conditionNotes && ` · ${f.conditionNotes}`}
                    </p>
                    {isOfficer && f.status === 'MATCHED' && (
                      <button className="btn btn-success btn-sm" style={{ marginTop: 10 }}
                        onClick={() => api.patch(`/lost-found/found/${f.id}/returned`).then(() => { toast('success', 'Returned to owner'); load(); })}>
                        <CheckCheck size={14} /> Mark returned to owner
                      </button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )
          )}

          {tab === 'matches' && isOfficer && (
            matchesLoading ? <Spinner label="AI is comparing lost reports with found items…" /> :
            !matches || matches.pairs.length === 0 ? (
              <EmptyState icon={<Sparkles size={26} />} title="No plausible matches right now" hint="New reports and found items are compared automatically - check back later." />
            ) : (
              <motion.div key="matches" variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!matches.aiRanked && <motion.span variants={fadeUp} className="chip warn">AI unavailable - heuristic text matching shown</motion.span>}
                {matches.pairs.map((p) => (
                  <motion.div key={`${p.lostReportId}-${p.foundItemId}`} variants={fadeUp} className="glass" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                      <span className="chip brand"><Sparkles size={12} /> {(p.confidence * 100).toFixed(0)}% match</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{p.reason}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div style={{ padding: 12, borderRadius: 12, background: 'color-mix(in srgb, var(--danger) 7%, transparent)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>LOST</div>
                        <strong style={{ fontSize: 14 }}>{p.lostReport.title}</strong>
                        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>{p.lostReport.lastSeenLocation}</p>
                      </div>
                      <div style={{ padding: 12, borderRadius: 12, background: 'color-mix(in srgb, var(--success) 8%, transparent)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>FOUND</div>
                        <strong style={{ fontSize: 14 }}>{p.foundItem.title}</strong>
                        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>{p.foundItem.foundLocation}</p>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => confirmMatch(p)}>
                      <CheckCheck size={14} /> Confirm match & notify owner
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )
          )}
        </div>
      </div>

      <ReportLostModal open={reportOpen} onClose={() => setReportOpen(false)} onDone={load} />
      {isOfficer && <LogFoundModal open={logOpen} onClose={() => setLogOpen(false)} onDone={load} />}
    </Page>
  );
}

function ReportLostModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [form, setForm] = useState({ title: '', description: '', lastSeenLocation: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      await api.post('/lost-found/lost', fd);
      toast('success', 'Lost report filed - officers are notified');
      onClose(); onDone();
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report a lost item">
      <form onSubmit={submit}>
        <div className="field"><label>What did you lose? <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Blue Nike backpack" /></div>
        <div className="field"><label>Description <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Distinctive marks, contents, stickers…" /></div>
        <div className="field"><label>Last seen location <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.lastSeenLocation} onChange={(e) => setForm({ ...form, lastSeenLocation: e.target.value })} placeholder="Library level 2, near the printers" /></div>
        <div className="field"><label>Photo (optional)</label>
          <input className="input" type="file" accept="image/*" style={{ paddingTop: 10 }} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div>
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Filing…' : 'File report'}</button>
      </form>
    </Modal>
  );
}

function LogFoundModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [form, setForm] = useState({ title: '', description: '', foundLocation: '', conditionNotes: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      await api.post('/lost-found/found', fd);
      toast('success', 'Found item logged');
      onClose(); onDone();
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a found item">
      <form onSubmit={submit}>
        <div className="field"><label>Item <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field"><label>Description <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="field"><label>Found location <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.foundLocation} onChange={(e) => setForm({ ...form, foundLocation: e.target.value })} /></div>
        <div className="field"><label>Condition notes</label>
          <input className="input" value={form.conditionNotes} onChange={(e) => setForm({ ...form, conditionNotes: e.target.value })} /></div>
        <div className="field"><label>Photo</label>
          <input className="input" type="file" accept="image/*" style={{ paddingTop: 10 }} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div>
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Logging…' : 'Log item'}</button>
      </form>
    </Modal>
  );
}
