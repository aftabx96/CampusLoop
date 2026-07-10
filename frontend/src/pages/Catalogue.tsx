import { motion } from 'framer-motion';
import { Boxes, Filter, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Modal, Page, TiltCard, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

export interface Asset {
  id: string; name: string; description: string; category: string; kind: string;
  condition: string; availability: string; photoUrl?: string; value: number;
  tags: string[]; bookingLeadTimeHours: number;
  department?: { id: string; name: string; faculty: string };
  attributes?: Record<string, unknown>;
}

const categories = ['', 'LAB_EQUIPMENT', 'AV_GEAR', 'STUDY_ROOM', 'TEXTBOOK', 'BICYCLE', 'SPORTS', 'OTHER'];
const catLabel = (c: string) => (c ? c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : 'All categories');

export const availChip = (a: string) =>
  a === 'AVAILABLE' ? 'ok' : a === 'MAINTENANCE' ? 'warn' : 'bad';

export default function Catalogue() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [items, setItems] = useState<Asset[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const canManage = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/assets', { params: { q: q || undefined, category: category || undefined, limit: 50 } });
      setItems(data.items);
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <Page>
      <div className="page">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Asset Catalogue</h1>
              <p className="page-sub" style={{ marginBottom: 0 }}>Lab gear, rooms, textbooks and bikes across all 8 faculties.</p>
            </div>
            {canManage && (
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add asset
              </button>
            )}
          </div>

          <div className="glass" style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 26, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 220, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
              <input className="input" aria-label="Search assets" placeholder="Full-text search: name, description, tags…"
                style={{ width: '100%', paddingLeft: 40 }} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <Filter size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
              <select className="input" aria-label="Filter by category" style={{ width: '100%', paddingLeft: 38 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-3">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Boxes size={26} />} title="No assets match your search" hint="Try a different keyword or clear the category filter." />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-3">
              {items.map((a) => (
                <motion.div key={a.id} variants={fadeUp}>
                  <Link to={`/app/assets/${a.id}`}>
                    <TiltCard style={{ overflow: 'hidden', height: '100%' }}>
                      <div style={{ height: 130, margin: -1, borderRadius: 'var(--r-md) var(--r-md) 0 0', overflow: 'hidden', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent-2) 22%, transparent))', display: 'grid', placeItems: 'center' }}>
                        {a.photoUrl
                          ? <img src={a.photoUrl} alt={a.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Boxes size={36} color="var(--accent)" style={{ opacity: 0.6 }} />}
                      </div>
                      <div style={{ padding: 18 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span className={`chip ${availChip(a.availability)}`}>{a.availability.toLowerCase()}</span>
                          <span className="chip">{catLabel(a.category)}</span>
                        </div>
                        <h3 style={{ fontSize: 16.5, marginBottom: 6 }}>{a.name}</h3>
                        <p style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {a.description}
                        </p>
                        <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 10 }}>
                          {a.department?.name} · condition {a.condition.toLowerCase()}
                        </p>
                      </div>
                    </TiltCard>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      {canManage && <AddAssetModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />}
    </Page>
  );
}

function AddAssetModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useUi();
  const [form, setForm] = useState({ name: '', description: '', category: 'LAB_EQUIPMENT', kind: 'PHYSICAL_ITEM', tags: '', value: '0', bookingLeadTimeHours: '0' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value });

  const isRoom = form.kind === 'ROOM';
  const photoMissing = useMemo(() => !isRoom && !photo, [isRoom, photo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoMissing) { toast('error', 'A photo is required for physical assets'); return; }
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      await api.post('/assets', fd);
      toast('success', 'Asset added to catalogue');
      onClose();
      onCreated();
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add asset">
      <form onSubmit={submit}>
        <div className="field">
          <label>Name <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input" required value={form.name} onChange={set('name')} placeholder="Zoom H6 Audio Recorder" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="input" value={form.description} onChange={set('description')} placeholder="What is it, what is it good for?" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {categories.filter(Boolean).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Kind</label>
            <select className="input" value={form.kind} onChange={set('kind')}>
              <option value="PHYSICAL_ITEM">Physical item</option>
              <option value="ROOM">Room</option>
              <option value="LOANABLE_GOOD">Loanable good</option>
            </select>
          </div>
          <div className="field">
            <label>Value (USD)</label>
            <input className="input" type="number" min="0" value={form.value} onChange={set('value')} />
            <span className="hint">≥ $500 requires manager approval</span>
          </div>
          <div className="field">
            <label>Lead time (hours)</label>
            <input className="input" type="number" min="0" value={form.bookingLeadTimeHours} onChange={set('bookingLeadTimeHours')} />
          </div>
        </div>
        <div className="field">
          <label>Tags (comma separated)</label>
          <input className="input" value={form.tags} onChange={set('tags')} placeholder="audio, recording, podcast" />
        </div>
        <div className="field">
          <label>Photo {!isRoom && <span aria-hidden style={{ color: 'var(--danger)' }}>*</span>}</label>
          <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} style={{ paddingTop: 10 }} />
          <span className="hint">Required for all physical assets (PNG/JPEG/WebP, max 8 MB)</span>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Saving…' : 'Add to catalogue'}
        </button>
      </form>
    </Modal>
  );
}
