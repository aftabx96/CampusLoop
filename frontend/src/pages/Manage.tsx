import { motion } from 'framer-motion';
import { Check, ClipboardCheck, Inbox, ScanEye, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Modal, Page, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useUi } from '../stores/ui';

interface ManagedBooking {
  id: string; startsAt: string; endsAt: string; purpose?: string; status: string;
  asset: { name: string; value: number; department?: { name: string } };
  requester: { fullName: string; email: string };
  returnNotes?: string; returnPhotoUrl?: string; conditionAtBorrow?: string; conditionAtReturn?: string;
  aiAssessment?: { condition: string; damageDescription: string; recommendedAction: string; confidence: number; aiGenerated: boolean } | null;
}

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'];
const ACTIONS = ['READY_FOR_REUSE', 'NEEDS_REPAIR', 'RETIRE'];

export default function Manage() {
  const { toast } = useUi();
  const [pending, setPending] = useState<ManagedBooking[]>([]);
  const [inspections, setInspections] = useState<ManagedBooking[]>([]);
  const [inspecting, setInspecting] = useState<ManagedBooking | null>(null);

  const load = () => {
    api.get('/bookings/pending').then(({ data }) => setPending(data)).catch(() => {});
    api.get('/bookings/inspections').then(({ data }) => setInspections(data)).catch(() => {});
  };
  useEffect(load, []);

  const decide = async (b: ManagedBooking, decision: 'APPROVED' | 'DECLINED') => {
    try {
      await api.patch(`/bookings/${b.id}/decision`, { decision });
      toast('success', `Booking ${decision.toLowerCase()} - student notified via WebSocket`);
      load();
    } catch (err) { toast('error', errMsg(err)); }
  };

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 880 }}>
          <h1 className="page-title">Department Management</h1>
          <p className="page-sub">Approve high-value bookings and confirm AI condition assessments.</p>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inbox size={18} color="var(--accent)" /> Pending approvals ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <EmptyState icon={<ClipboardCheck size={24} />} title="Approval queue is empty" hint="High-value bookings appear here instantly via WebSocket." />
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pending.map((b) => (
                  <motion.div key={b.id} variants={fadeUp} className="glass" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong>{b.asset?.name}</strong>
                        <span className="chip warn">Rs {Number(b.asset?.value).toLocaleString('en-PK')} value</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {b.requester?.fullName} · {new Date(b.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      {b.purpose && <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>"{b.purpose}"</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={() => decide(b, 'APPROVED')}><Check size={14} /> Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => decide(b, 'DECLINED')}><X size={14} /> Decline</button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScanEye size={18} color="var(--accent-2)" /> Returns awaiting inspection ({inspections.length})
            </h2>
            {inspections.length === 0 ? (
              <EmptyState icon={<ScanEye size={24} />} title="No returns to inspect" hint="When a student returns an item, AI pre-fills the report and it lands here." />
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {inspections.map((b) => (
                  <motion.div key={b.id} variants={fadeUp} className="glass card-hover" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong>{b.asset?.name}</strong>
                        {b.aiAssessment?.aiGenerated
                          ? <span className="chip brand"><Sparkles size={12} /> AI pre-filled</span>
                          : <span className="chip warn">manual inspection</span>}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Returned by {b.requester?.fullName}</p>
                      {b.returnNotes && <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>"{b.returnNotes}"</p>}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setInspecting(b)}>Review</button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        </div>
      </div>
      <InspectionModal booking={inspecting} onClose={() => setInspecting(null)} onDone={load} />
    </Page>
  );
}

function InspectionModal({ booking, onClose, onDone }: { booking: ManagedBooking | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [condition, setCondition] = useState('GOOD');
  const [action, setAction] = useState('READY_FOR_REUSE');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking?.aiAssessment?.aiGenerated) {
      setCondition(booking.aiAssessment.condition);
      setAction(booking.aiAssessment.recommendedAction);
    } else {
      setCondition(booking?.conditionAtReturn ?? 'GOOD');
      setAction('READY_FOR_REUSE');
    }
    setNotes('');
  }, [booking?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/inspection`, { condition, recommendedAction: action, notes: notes || undefined });
      toast('success', 'Inspection saved - asset condition updated');
      onClose(); onDone();
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };

  const ai = booking?.aiAssessment;

  return (
    <Modal open={!!booking} onClose={onClose} title={`Inspect: ${booking?.asset?.name ?? ''}`}>
      {booking?.returnPhotoUrl && (
        <img src={booking.returnPhotoUrl} alt="Returned item" style={{ borderRadius: 14, marginBottom: 14, maxHeight: 220, objectFit: 'cover', width: '100%' }} />
      )}
      {ai?.aiGenerated ? (
        <div className="glass" style={{ padding: 14, marginBottom: 16, fontSize: 13.5, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="chip brand"><Sparkles size={12} /> AI assessment · {(ai.confidence * 100).toFixed(0)}% confident</span>
          </div>
          Borrowed as <strong>{booking?.conditionAtBorrow?.toLowerCase()}</strong>, AI estimates{' '}
          <strong>{ai.condition.toLowerCase()}</strong> → {ai.recommendedAction.replace(/_/g, ' ').toLowerCase()}.
          {ai.damageDescription && <> Damage: {ai.damageDescription}</>}
          <div style={{ color: 'var(--ink-3)', marginTop: 6, fontSize: 12.5 }}>Confirm below, or override any field.</div>
        </div>
      ) : (
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16 }}>
          AI was unavailable for this return - please complete the inspection manually.
        </p>
      )}
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Condition</label>
            <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Action</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ').toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Inspector notes</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes appended to the report" />
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Saving…' : ai?.aiGenerated ? 'Confirm inspection' : 'Save inspection'}
        </button>
      </form>
    </Modal>
  );
}
