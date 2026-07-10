import { motion } from 'framer-motion';
import { Check, GraduationCap, Sparkles, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Page, Spinner, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface Profile { modules: string[]; availableSlots: string[]; studyStyle: string; user?: { fullName: string } }
interface Suggestion { userId: string; score: number; summary: string; profile?: Profile & { user?: { fullName: string } } }
interface Match {
  id: string; status: string; compatibilityScore: number; summary?: string; acceptedBy: string[];
  userA: { id: string; fullName: string; email?: string }; userAId: string;
  userB: { id: string; fullName: string; email?: string }; userBId: string;
}

export default function StudyGroups() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ modules: '', availableSlots: '', studyStyle: 'GROUP' });
  const [suggestions, setSuggestions] = useState<{ aiRanked: boolean; matches: Suggestion[] } | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMatches = () => api.get('/study/matches').then(({ data }) => setMatches(data)).catch(() => {});

  useEffect(() => {
    api.get('/study/profile').then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({ modules: data.modules.join(', '), availableSlots: data.availableSlots.join(', '), studyStyle: data.studyStyle });
      }
    }).catch(() => {});
    loadMatches();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/study/profile', {
        modules: form.modules.split(',').map((s) => s.trim()).filter(Boolean),
        availableSlots: form.availableSlots.split(',').map((s) => s.trim()).filter(Boolean),
        studyStyle: form.studyStyle,
      });
      setProfile(data);
      toast('success', 'Study profile saved');
    } catch (err) { toast('error', errMsg(err)); } finally { setSaving(false); }
  };

  const findPartners = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/study/matches/suggest');
      setSuggestions(data);
    } catch (err) { toast('error', errMsg(err)); } finally { setLoading(false); }
  };

  const propose = async (s: Suggestion) => {
    try {
      await api.post('/study/matches/propose', { userId: s.userId, score: s.score, summary: s.summary });
      toast('success', 'Proposal sent - they will be notified in real time');
      loadMatches();
    } catch (err) { toast('error', errMsg(err)); }
  };

  const respond = async (m: Match, accept: boolean) => {
    try {
      await api.patch(`/study/matches/${m.id}/respond`, { accept });
      toast(accept ? 'success' : 'info', accept ? 'Accepted!' : 'Declined');
      loadMatches();
    } catch (err) { toast('error', errMsg(err)); }
  };

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 880 }}>
          <span className="chip brand" style={{ marginBottom: 12 }}><Sparkles size={13} /> AI Feature 3 - Study Group Matcher</span>
          <h1 className="page-title">Study Groups</h1>
          <p className="page-sub">AI pairs you with compatible study partners. Contact details are exchanged only after both accept.</p>

          {/* profile */}
          <motion.form onSubmit={saveProfile} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong" style={{ padding: 26, marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>My study profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Modules (comma separated)</label>
                <input className="input" value={form.modules} onChange={(e) => setForm({ ...form, modules: e.target.value })} placeholder="CS301 Algorithms, CS310 Web Technologies" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Available slots</label>
                <input className="input" value={form.availableSlots} onChange={(e) => setForm({ ...form, availableSlots: e.target.value })} placeholder="MON 14:00-16:00, WED 10:00-12:00" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Study style</label>
                <select className="input" value={form.studyStyle} onChange={(e) => setForm({ ...form, studyStyle: e.target.value })}>
                  <option value="SOLO">Solo (quiet co-working)</option>
                  <option value="GROUP">Group</option>
                  <option value="DISCUSSION">Discussion-heavy</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button className="btn btn-glass" type="submit" disabled={saving}>{saving ? 'Saving…' : profile ? 'Update profile' : 'Save profile'}</button>
              <button className="btn btn-primary" type="button" disabled={!profile || loading} onClick={findPartners}>
                <Sparkles size={16} /> {loading ? 'Matching…' : 'Find partners with AI'}
              </button>
            </div>
          </motion.form>

          {loading && <Spinner label="AI is ranking compatible students…" />}

          {suggestions && !loading && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Suggested partners</h2>
              {!suggestions.aiRanked && <span className="chip warn" style={{ marginBottom: 12 }}>AI unavailable - showing overlap-based matches</span>}
              {suggestions.matches.length === 0 ? (
                <EmptyState icon={<GraduationCap size={24} />} title="No compatible students found yet" hint="More matches appear as students create profiles." />
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {suggestions.matches.map((s) => (
                    <motion.div key={s.userId} variants={fadeUp} className="glass card-hover" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '35%', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                        {(s.profile?.user?.fullName ?? 'S').split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong>{s.profile?.user?.fullName ?? 'Student'}</strong>
                          <span className="chip brand">{(s.score * 100).toFixed(0)}% compatible</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{s.summary}</p>
                        {s.profile && <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{s.profile.modules.join(' · ')}</p>}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => propose(s)}><UserPlus size={14} /> Propose</button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* my matches */}
          <section>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>My matches</h2>
            {matches.length === 0 ? (
              <EmptyState icon={<GraduationCap size={24} />} title="No matches yet" hint="Propose a partner above, or accept an incoming proposal." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matches.map((m) => {
                  const other = m.userAId === user?.id ? m.userB : m.userA;
                  const iAccepted = m.acceptedBy?.includes(user?.id ?? '');
                  return (
                    <div key={m.id} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong>{other?.fullName}</strong>
                          <span className={`chip ${m.status === 'CONFIRMED' ? 'ok' : m.status === 'DECLINED' ? 'bad' : 'warn'}`}>
                            {m.status === 'ACCEPTED_BY_ONE' ? (iAccepted ? 'waiting for them' : 'awaiting your reply') : m.status.toLowerCase()}
                          </span>
                        </div>
                        {m.summary && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{m.summary}</p>}
                        {m.status === 'CONFIRMED' && other?.email && (
                          <p style={{ fontSize: 13, marginTop: 6 }}>
                            Contact: <a href={`mailto:${other.email}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{other.email}</a>
                          </p>
                        )}
                      </div>
                      {m.status === 'ACCEPTED_BY_ONE' && !iAccepted && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-success btn-sm" onClick={() => respond(m, true)}><Check size={14} /> Accept</button>
                          <button className="btn btn-danger btn-sm" onClick={() => respond(m, false)}><X size={14} /> Decline</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
