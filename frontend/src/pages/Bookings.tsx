import { motion } from 'framer-motion';
import { CalendarCheck, Camera, PackageCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Modal, Page, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useUi } from '../stores/ui';

interface Booking {
  id: string; startsAt: string; endsAt: string; status: string; purpose?: string;
  asset: { id: string; name: string; photoUrl?: string };
  conditionAtReturn?: string; recommendedAction?: string;
  aiAssessment?: { condition: string; damageDescription: string; recommendedAction: string; confidence: number; aiGenerated: boolean } | null;
}

const statusChip: Record<string, string> = {
  APPROVED: 'ok', ACTIVE: 'ok', PENDING: 'warn', DECLINED: 'bad', CANCELLED: 'bad', RETURNED: 'brand',
};

export default function Bookings() {
  const { toast } = useUi();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [returning, setReturning] = useState<Booking | null>(null);

  const load = () => api.get('/bookings/mine').then(({ data }) => setBookings(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 860 }}>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-sub">Approvals arrive here in real time. Return items with a photo - AI drafts the inspection report.</p>

          {bookings.length === 0 ? (
            <EmptyState icon={<CalendarCheck size={26} />} title="No bookings yet" hint="Find something in the catalogue or ask AI in Discover." />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bookings.map((b) => (
                <motion.div key={b.id} variants={fadeUp} className="glass card-hover" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <strong style={{ fontSize: 16 }}>{b.asset?.name}</strong>
                      <span className={`chip ${statusChip[b.status] ?? ''}`}>{b.status.toLowerCase()}</span>
                    </div>
                    <p style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>
                      {new Date(b.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(b.endsAt).toLocaleString([], { timeStyle: 'short' })}
                    </p>
                    {b.purpose && <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 3 }}>{b.purpose}</p>}
                    {b.status === 'RETURNED' && b.conditionAtReturn && (
                      <p style={{ fontSize: 12.5, marginTop: 6, color: 'var(--ink-2)' }}>
                        Returned in <strong>{b.conditionAtReturn.toLowerCase()}</strong> condition
                        {b.aiAssessment?.aiGenerated && ' (AI-assessed, pending manager confirmation)'}
                      </p>
                    )}
                  </div>
                  {(b.status === 'APPROVED' || b.status === 'ACTIVE') && (
                    <button className="btn btn-glass btn-sm" onClick={() => setReturning(b)}>
                      <PackageCheck size={15} /> Return item
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      <ReturnModal booking={returning} onClose={() => setReturning(null)} onDone={load} />
    </Page>
  );
}

function ReturnModal({ booking, onClose, onDone }: { booking: Booking | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Booking | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('description', description);
    if (photo) fd.append('photo', photo);
    try {
      const { data } = await api.post(`/bookings/${booking.id}/return`, fd);
      setResult(data);
      onDone();
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setResult(null); setDescription(''); setPhoto(null); onClose(); };

  return (
    <Modal open={!!booking} onClose={close} title={result ? 'AI Condition Assessment' : `Return ${booking?.asset?.name ?? ''}`}>
      {!result ? (
        <form onSubmit={submit}>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.6 }}>
            Upload a photo and a short note. <strong>AI Feature 2</strong> estimates the condition and pre-fills the
            inspection report - the lab manager confirms or overrides it.
          </p>
          <div className="field">
            <label>Photo of returned item</label>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp" style={{ paddingTop: 10 }}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          <div className="field">
            <label>Short description <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea className="input" required value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Everything works, small scratch on the left side near the dial." />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy || !description.trim()} style={{ width: '100%' }}>
            <Camera size={16} /> {busy ? 'AI is inspecting…' : 'Submit return'}
          </button>
        </form>
      ) : (
        <div>
          {result.aiAssessment?.aiGenerated ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span className={`chip ${result.aiAssessment.condition === 'DAMAGED' ? 'bad' : result.aiAssessment.condition === 'FAIR' ? 'warn' : 'ok'}`}>
                  {result.aiAssessment.condition.toLowerCase()}
                </span>
                <span className="chip brand">{result.aiAssessment.recommendedAction.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="chip">confidence {(result.aiAssessment.confidence * 100).toFixed(0)}%</span>
              </div>
              {result.aiAssessment.damageDescription && (
                <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.6 }}>
                  {result.aiAssessment.damageDescription}
                </p>
              )}
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
                The lab manager will review and confirm this AI assessment before it's final.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 18, lineHeight: 1.6 }}>
              AI was unavailable, so no pre-fill was generated - the manager will complete the inspection form manually.
              Your return has been recorded.
            </p>
          )}
          <button className="btn btn-primary" onClick={close} style={{ width: '100%' }}>Done</button>
        </div>
      )}
    </Modal>
  );
}
