import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clock, Sparkles, Wand2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Spinner, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface SearchHit {
  asset: { id: string; name: string; description: string; category: string; photoUrl?: string; availability: string; department?: { name: string } };
  rank: number;
  rationale?: string;
  predictedReturnDays?: number;
  available: boolean;
}

const suggestions = [
  'something to record audio for my documentary project',
  'a quiet room for 4 people on Wednesday',
  'equipment to measure voltage in circuits lab',
  'a laptop with video editing software for the weekend',
];

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ aiRanked: boolean; queryInterpretation?: string; results: SearchHit[] } | null>(null);

  const search = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    if (q) setQuery(q);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/smart-search', { query: text });
      setResult(data);
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); search(); };

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 860 }}>
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ textAlign: 'center', marginBottom: 36 }}>
            <motion.span variants={fadeUp} className="chip brand"><Sparkles size={13} /> AI Feature 1 - Smart Search</motion.span>
            <motion.h1 variants={fadeUp} className="page-title" style={{ margin: '14px 0 8px' }}>
              Hey {user?.fullName.split(' ')[0]}, what do you need?
            </motion.h1>
            <motion.p variants={fadeUp} className="page-sub" style={{ marginBottom: 0 }}>
              Describe it in your own words - AI finds the right asset across every department.
            </motion.p>
          </motion.div>

          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.15 }}
            className="glass-strong"
            style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 999, marginBottom: 18 }}
          >
            <input
              className="input"
              aria-label="Describe what you need"
              style={{ flex: 1, border: 'none', background: 'transparent', boxShadow: 'none', minHeight: 48 }}
              placeholder='e.g. "something to record audio for my documentary…"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !query.trim()} style={{ borderRadius: 999 }}>
              <Wand2 size={16} /> {loading ? 'Thinking…' : 'Search'}
            </button>
          </motion.form>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 34 }}>
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => search(s)} style={{ cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
                {s}
              </button>
            ))}
          </div>

          {loading && <Spinner label="AI is matching assets to your request…" />}

          <AnimatePresence mode="popLayout">
            {result && !loading && (
              <motion.div key={result.queryInterpretation ?? 'results'} variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }}>
                {result.queryInterpretation && (
                  <motion.p variants={fadeUp} style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, textAlign: 'center' }}>
                    <Sparkles size={13} style={{ verticalAlign: -2 }} /> {result.queryInterpretation}
                  </motion.p>
                )}
                {!result.aiRanked && result.results.length > 0 && (
                  <motion.p variants={fadeUp} className="chip warn" style={{ marginBottom: 18 }}>
                    AI unavailable - showing keyword results instead
                  </motion.p>
                )}
                {result.results.length === 0 && (
                  <motion.p variants={fadeUp} style={{ textAlign: 'center', color: 'var(--ink-2)', padding: 30 }}>
                    No matching assets found. Try different words, or browse the <Link to="/app/catalogue" style={{ color: 'var(--accent)' }}>full catalogue</Link>.
                  </motion.p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {result.results.map((r) => (
                    <motion.div key={r.asset.id} variants={fadeUp}>
                      <Link to={`/app/assets/${r.asset.id}`}>
                        <div className="glass card-hover" style={{ display: 'flex', gap: 18, padding: 18, alignItems: 'center' }}>
                          <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
                            {r.rank}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: 16 }}>{r.asset.name}</strong>
                              <span className={`chip ${r.available ? 'ok' : 'bad'}`}>{r.available ? 'Available' : 'Unavailable'}</span>
                              {r.asset.department && <span className="chip">{r.asset.department.name}</span>}
                            </div>
                            {r.rationale && <p style={{ color: 'var(--ink-2)', fontSize: 13.5, marginTop: 6 }}>{r.rationale}</p>}
                            {r.predictedReturnDays != null && (
                              <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Clock size={12} /> Typically returned in ~{r.predictedReturnDays} day{r.predictedReturnDays === 1 ? '' : 's'}
                              </p>
                            )}
                          </div>
                          <ArrowRight size={18} color="var(--ink-3)" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}
