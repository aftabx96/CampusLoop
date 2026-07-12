import { motion } from 'framer-motion';
import { ArrowLeft, Boxes, CalendarPlus, Clock, ImageUp, MapPin, Save, ShieldAlert, Tag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page, Spinner } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { Asset, availChip, catLabel, categories } from './Catalogue';

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'];
const AVAILABILITIES = ['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'RETIRED'];

interface Slot { id: string; startsAt: string; endsAt: string; status: string }

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00–19:00

export default function AssetDetail() {
  const { id } = useParams();
  const { toast } = useUi();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState(() => new Date(Date.now() + 86400_000).toISOString().slice(0, 10));
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [edit, setEdit] = useState({
    name: '', description: '', category: '', condition: '', availability: '',
    value: '0', bookingLeadTimeHours: '0', tags: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/assets/${id}`).then(({ data }) => {
      setAsset(data);
      setEdit({
        name: data.name, description: data.description ?? '', category: data.category, condition: data.condition,
        availability: data.availability, value: String(data.value ?? 0), bookingLeadTimeHours: String(data.bookingLeadTimeHours ?? 0),
        tags: (data.tags ?? []).join(', '),
      });
    }).catch((e) => toast('error', errMsg(e)));
  }, [id]);

  const canManage = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const loadSlots = () => {
    if (canManage) return; // managers see the edit form, not the booking calendar
    const from = `${day}T00:00:00Z`;
    const to = `${day}T23:59:59Z`;
    api.get(`/bookings/availability/${id}`, { params: { from, to } })
      .then(({ data }) => setSlots(data))
      .catch(() => {});
  };
  useEffect(loadSlots, [id, day, canManage]);

  const taken = useMemo(() => {
    const set = new Set<number>();
    for (const s of slots) {
      const start = new Date(s.startsAt);
      const end = new Date(s.endsAt);
      for (const h of HOURS) {
        const cell = new Date(`${day}T${String(h).padStart(2, '0')}:00:00`);
        const cellEnd = new Date(cell.getTime() + 3600_000);
        if (cell < end && cellEnd > start) set.add(h);
      }
    }
    return set;
  }, [slots, day]);

  const pick = (h: number) => {
    if (taken.has(h)) return;
    if (selStart === null || (selEnd !== null && selEnd !== selStart)) {
      setSelStart(h); setSelEnd(h);
    } else if (h >= selStart) {
      for (let x = selStart; x <= h; x++) if (taken.has(x)) { setSelStart(h); setSelEnd(h); return; }
      setSelEnd(h);
    } else {
      setSelStart(h); setSelEnd(h);
    }
  };

  const book = async () => {
    if (selStart === null || selEnd === null) return;
    setBusy(true);
    try {
      const startsAt = new Date(`${day}T${String(selStart).padStart(2, '0')}:00:00`);
      const endsAt = new Date(`${day}T${String(selEnd + 1).padStart(2, '0')}:00:00`);
      const { data } = await api.post('/bookings', {
        assetId: id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), purpose: purpose || undefined,
      });
      toast('success', data.status === 'PENDING'
        ? 'Booking requested - high-value asset, awaiting manager approval'
        : 'Booking confirmed!');
      setSelStart(null); setSelEnd(null); setPurpose('');
      loadSlots();
    } catch (err) {
      toast('error', errMsg(err));
      loadSlots();
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setPhotoBusy(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await api.patch(`/assets/${id}`, fd);
      setAsset(data);
      toast('success', 'Product photo updated');
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('name', edit.name);
    fd.append('description', edit.description);
    fd.append('category', edit.category);
    fd.append('condition', edit.condition);
    fd.append('availability', edit.availability);
    fd.append('value', edit.value);
    fd.append('bookingLeadTimeHours', edit.bookingLeadTimeHours);
    fd.append('tags', edit.tags);
    try {
      const { data } = await api.patch(`/assets/${id}`, fd);
      setAsset(data);
      toast('success', 'Asset updated');
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return <Page><div className="page"><Spinner label="Loading asset…" /></div></Page>;

  const highValue = Number(asset.value) >= 100000;

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 980 }}>
          <Link to="/app/catalogue" className="chip" style={{ marginBottom: 20, display: 'inline-flex' }}>
            <ArrowLeft size={13} /> Back to catalogue
          </Link>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 16 }}>
            {/* left: asset info */}
            <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 26 }} className="glass-strong" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, transparent), color-mix(in srgb, var(--accent-2) 24%, transparent))' }}>
                {asset.photoUrl
                  ? <img src={asset.photoUrl} alt={asset.name} style={{ width: '100%', height: 'auto', maxHeight: 420, display: 'block', objectFit: 'contain' }} />
                  : <div style={{ height: 240, display: 'grid', placeItems: 'center' }}><Boxes size={54} color="var(--accent)" style={{ opacity: 0.55 }} /></div>}
                {canManage && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      className="btn btn-glass btn-sm"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoBusy}
                      aria-label="Change product photo"
                      style={{ position: 'absolute', top: 12, right: 12, gap: 6 }}
                    >
                      <ImageUp size={15} /> {photoBusy ? 'Uploading…' : 'Edit photo'}
                    </button>
                  </>
                )}
              </div>
              <div style={{ padding: 26 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className={`chip ${availChip(asset.availability)}`}>{asset.availability.toLowerCase()}</span>
                  <span className="chip">{asset.condition.toLowerCase()} condition</span>
                  {highValue && <span className="chip warn"><ShieldAlert size={12} /> approval required</span>}
                </div>
                <h1 style={{ fontSize: 26, marginBottom: 6 }}>{asset.name}</h1>
                {Number(asset.value) > 0 && (
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                    Rs {Number(asset.value).toLocaleString('en-PK')}
                  </p>
                )}
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.7, fontSize: 14.5, marginBottom: 18 }}>{asset.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={14} /> {asset.department?.name} · {asset.department?.faculty}</span>
                  {asset.bookingLeadTimeHours > 0 && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={14} /> Requires {asset.bookingLeadTimeHours}h booking lead time</span>}
                  {asset.tags?.length > 0 && (
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag size={14} /> {asset.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* right: manage form (staff/admin) or booking calendar (everyone else) */}
            {canManage ? (
              <motion.form
                onSubmit={saveAsset}
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.08 }}
                className="glass-strong" style={{ padding: 26 }}
              >
                <h2 style={{ fontSize: 19, marginBottom: 6 }}>Manage asset</h2>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 16 }}>
                  Update the catalogue listing. Changes are visible to everyone immediately.
                </p>
                <div className="field">
                  <label htmlFor="editName">Name</label>
                  <input id="editName" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label htmlFor="editDescription">Description</label>
                  <textarea id="editDescription" className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label htmlFor="editCategory">Category</label>
                    <select id="editCategory" className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                      {categories.filter(Boolean).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="editCondition">Condition</label>
                    <select id="editCondition" className="input" value={edit.condition} onChange={(e) => setEdit({ ...edit, condition: e.target.value })}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="editAvailability">Availability</label>
                    <select id="editAvailability" className="input" value={edit.availability} onChange={(e) => setEdit({ ...edit, availability: e.target.value })}>
                      {AVAILABILITIES.map((a) => <option key={a} value={a}>{a.toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="editValue">Value (PKR)</label>
                    <input id="editValue" className="input" type="number" min="0" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="editLeadTime">Lead time (hours)</label>
                    <input id="editLeadTime" className="input" type="number" min="0" value={edit.bookingLeadTimeHours} onChange={(e) => setEdit({ ...edit, bookingLeadTimeHours: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="editTags">Tags (comma separated)</label>
                  <input id="editTags" className="input" value={edit.tags} onChange={(e) => setEdit({ ...edit, tags: e.target.value })} placeholder="audio, recording, podcast" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
                  <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
                </button>
              </motion.form>
            ) : (
              <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.08 }} className="glass-strong" style={{ padding: 26 }}>
                <h2 style={{ fontSize: 19, marginBottom: 6 }}>Book a time slot</h2>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 16 }}>
                  Tap a start hour, then an end hour. Booked slots are locked at the database level - no double-bookings, ever.
                </p>
                <div className="field">
                  <label htmlFor="day">Date</label>
                  <input id="day" className="input" type="date" value={day} min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => { setDay(e.target.value); setSelStart(null); setSelEnd(null); }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  {HOURS.map((h) => {
                    const isTaken = taken.has(h);
                    const isSel = selStart !== null && selEnd !== null && h >= selStart && h <= selEnd;
                    return (
                      <motion.button
                        key={h}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => pick(h)}
                        disabled={isTaken}
                        aria-label={`${h}:00 ${isTaken ? 'booked' : isSel ? 'selected' : 'free'}`}
                        style={{
                          minHeight: 44, borderRadius: 12, fontSize: 13, fontWeight: 600,
                          border: '1px solid var(--glass-border)',
                          background: isTaken
                            ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
                            : isSel
                              ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                              : 'var(--glass)',
                          color: isTaken ? 'var(--danger)' : isSel ? '#fff' : 'var(--ink)',
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          textDecoration: isTaken ? 'line-through' : 'none',
                          transition: 'all 180ms var(--ease-spring)',
                        }}
                      >
                        {String(h).padStart(2, '0')}:00
                      </motion.button>
                    );
                  })}
                </div>
                <div className="field">
                  <label htmlFor="purpose">Purpose (optional)</label>
                  <input id="purpose" className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. documentary field recording" />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy || selStart === null} onClick={book}>
                  <CalendarPlus size={16} />
                  {busy ? 'Booking…'
                    : selStart === null ? 'Select a time slot'
                    : `Book ${String(selStart).padStart(2, '0')}:00 – ${String((selEnd ?? selStart) + 1).padStart(2, '0')}:00`}
                </button>
                {highValue && (
                  <p style={{ fontSize: 12.5, color: 'var(--warning)', marginTop: 10, textAlign: 'center' }}>
                    High-value asset - a manager must approve. You'll be notified instantly.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
