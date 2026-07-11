import { motion } from 'framer-motion';
import { HandHeart, Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Modal, Page, TiltCard, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface Listing {
  id: string; title: string; description: string; category: string; photoUrl?: string;
  maxLoanDays: number; owner: { id: string; fullName: string; reputationScore: number };
  ownerId: string;
}
interface Loan {
  id: string; status: string; dueAt: string;
  listing: Listing; borrower?: { id: string; fullName: string; reputationScore: number };
}

const loanChip: Record<string, string> = { REQUESTED: 'warn', ACTIVE: 'ok', RETURNED: 'brand', DECLINED: 'bad', OVERDUE: 'bad', DISPUTED: 'bad' };

export default function Lending() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [tab, setTab] = useState<'market' | 'borrowed' | 'lent'>('market');
  const [listings, setListings] = useState<Listing[]>([]);
  const [mine, setMine] = useState<Loan[]>([]);
  const [incoming, setIncoming] = useState<Loan[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [rating, setRating] = useState<Loan | null>(null);

  const load = () => {
    api.get('/lending/listings').then(({ data }) => setListings(data)).catch(() => {});
    api.get('/lending/loans/mine').then(({ data }) => setMine(data)).catch(() => {});
    api.get('/lending/loans/incoming').then(({ data }) => setIncoming(data)).catch(() => {});
  };
  useEffect(load, []);

  const request = async (l: Listing) => {
    try {
      await api.post(`/lending/loans/${l.id}/request`, { days: l.maxLoanDays });
      toast('success', `Request sent to ${l.owner.fullName.split(' ')[0]}`);
      load();
    } catch (err) { toast('error', errMsg(err)); }
  };

  const decide = async (loan: Loan, accept: boolean) => {
    try {
      await api.patch(`/lending/loans/${loan.id}/decision`, { accept });
      toast('success', accept ? 'Loan accepted' : 'Loan declined');
      load();
    } catch (err) { toast('error', errMsg(err)); }
  };

  const markReturned = async (loan: Loan) => {
    try {
      await api.patch(`/lending/loans/${loan.id}/return`);
      toast('success', 'Marked as returned - you can now rate each other');
      load();
    } catch (err) { toast('error', errMsg(err)); }
  };

  const tabs = [
    { k: 'market', label: 'Marketplace' },
    { k: 'borrowed', label: `Borrowed (${mine.length})` },
    { k: 'lent', label: `My items (${incoming.length})` },
  ] as const;

  return (
    <Page>
      <div className="page">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
            <div>
              <h1 className="page-title">Peer Lending</h1>
              <p className="page-sub" style={{ marginBottom: 0 }}>Borrow from fellow students. Reputation keeps everyone honest.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> List an item</button>
          </div>

          <div className="glass" style={{ display: 'inline-flex', gap: 4, padding: 5, borderRadius: 999, marginBottom: 26 }}>
            {tabs.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className="btn btn-sm" style={{
                borderRadius: 999, border: 'none',
                background: tab === t.k ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                color: tab === t.k ? '#fff' : 'var(--ink-2)',
              }}>{t.label}</button>
            ))}
          </div>

          {tab === 'market' && (
            listings.length === 0 ? <EmptyState icon={<HandHeart size={26} />} title="No listings yet" hint="Be the first to lend something!" /> : (
              <motion.div key="market" variants={stagger} initial="hidden" animate="show" className="grid grid-3">
                {listings.map((l) => (
                  <motion.div key={l.id} variants={fadeUp}>
                    <TiltCard style={{ padding: 22, height: '100%' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span className="chip brand">{l.category}</span>
                        <span className="chip">≤ {l.maxLoanDays} days</span>
                      </div>
                      <h3 style={{ fontSize: 17, marginBottom: 6 }}>{l.title}</h3>
                      <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{l.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Star size={12} fill="var(--warning)" color="var(--warning)" />
                          {Number(l.owner?.reputationScore ?? 5).toFixed(1)} · {l.owner?.fullName}
                        </span>
                        {l.ownerId !== user?.id && (
                          <button className="btn btn-primary btn-sm" onClick={() => request(l)}>Borrow</button>
                        )}
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </motion.div>
            )
          )}

          {tab === 'borrowed' && (
            mine.length === 0 ? <EmptyState icon={<HandHeart size={26} />} title="Nothing borrowed yet" /> : (
              <motion.div key="borrowed" variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mine.map((loan) => (
                  <motion.div key={loan.id} variants={fadeUp} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{loan.listing?.title}</strong>
                        <span className={`chip ${loanChip[loan.status] ?? ''}`}>{loan.status.toLowerCase()}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                        Due {new Date(loan.dueAt).toLocaleDateString([], { dateStyle: 'medium' })} · from {loan.listing?.owner?.fullName}
                      </p>
                    </div>
                    {loan.status === 'RETURNED' && (
                      <button className="btn btn-glass btn-sm" onClick={() => setRating(loan)}><Star size={14} /> Rate lender</button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )
          )}

          {tab === 'lent' && (
            incoming.length === 0 ? <EmptyState icon={<HandHeart size={26} />} title="No requests on your items yet" /> : (
              <motion.div key="lent" variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {incoming.map((loan) => (
                  <motion.div key={loan.id} variants={fadeUp} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{loan.listing?.title}</strong>
                        <span className={`chip ${loanChip[loan.status] ?? ''}`}>{loan.status.toLowerCase()}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                        {loan.borrower?.fullName} (★{Number(loan.borrower?.reputationScore ?? 5).toFixed(1)}) · due {new Date(loan.dueAt).toLocaleDateString()}
                      </p>
                    </div>
                    {loan.status === 'REQUESTED' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-success btn-sm" onClick={() => decide(loan, true)}>Accept</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decide(loan, false)}>Decline</button>
                      </div>
                    )}
                    {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && (
                      <button className="btn btn-glass btn-sm" onClick={() => markReturned(loan)}>Mark returned</button>
                    )}
                    {loan.status === 'RETURNED' && (
                      <button className="btn btn-glass btn-sm" onClick={() => setRating(loan)}><Star size={14} /> Rate borrower</button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )
          )}
        </div>
      </div>

      <AddListingModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <RateModal loan={rating} onClose={() => setRating(null)} onDone={load} />
    </Page>
  );
}

function AddListingModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useUi();
  const [form, setForm] = useState({ title: '', description: '', category: 'Textbooks', maxLoanDays: '7' });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/lending/listings', form);
      toast('success', 'Item listed for lending');
      onClose(); onCreated();
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="List an item for loan">
      <form onSubmit={submit}>
        <div className="field">
          <label>Title <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Casio FX-991EX Calculator" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Textbooks', 'Electronics', 'Transport', 'Sports', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Max loan days</label>
            <input className="input" type="number" min="1" max="60" value={form.maxLoanDays} onChange={(e) => setForm({ ...form, maxLoanDays: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Listing…' : 'Publish listing'}</button>
      </form>
    </Modal>
  );
}

function RateModal({ loan, onClose, onDone }: { loan: Loan | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useUi();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!loan) return;
    setBusy(true);
    try {
      await api.post(`/lending/loans/${loan.id}/rate`, { score, comment });
      toast('success', 'Rating submitted - reputation updated');
      onClose(); onDone();
    } catch (err) { toast('error', errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!loan} onClose={onClose} title="Rate this loan">
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button key={s} whileTap={{ scale: 0.85 }} onClick={() => setScore(s)} aria-label={`${s} stars`}
            style={{ background: 'none', border: 'none', padding: 6 }}>
            <Star size={30} fill={s <= score ? 'var(--warning)' : 'transparent'} color="var(--warning)" />
          </motion.button>
        ))}
      </div>
      <div className="field">
        <label>Comment (optional)</label>
        <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Returned on time, great condition." />
      </div>
      <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ width: '100%' }}>
        {busy ? 'Submitting…' : 'Submit rating'}
      </button>
    </Modal>
  );
}
