import { motion } from 'framer-motion';
import {
  ArrowRight, Boxes, CalendarCheck, GraduationCap, HandHeart,
  ScanEye, SearchX, ShieldCheck, Sparkles, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/NavBar';
import { Page, TiltCard, fadeUp, stagger } from '../components/ui';

const features = [
  { icon: <Sparkles size={22} />, title: 'AI Smart Search', text: 'Describe what you need in plain language — "something to record audio for my documentary" — and AI finds it, with a rationale and alternatives.' },
  { icon: <CalendarCheck size={22} />, title: 'Conflict-Free Booking', text: 'Database-level locking makes double-bookings impossible. Approvals arrive instantly over WebSocket.' },
  { icon: <ScanEye size={22} />, title: 'AI Condition Reports', text: 'Snap a photo at return — AI assesses the condition and pre-fills the inspection report for the lab manager.' },
  { icon: <HandHeart size={22} />, title: 'Peer Lending', text: 'Lend textbooks, calculators and bikes to fellow students, protected by mutual ratings and reputation.' },
  { icon: <SearchX size={22} />, title: 'Lost & Found AI', text: 'AI matches lost reports with found items so 40% of items no longer go unclaimed.' },
  { icon: <GraduationCap size={22} />, title: 'Study Group Matcher', text: 'AI pairs you with compatible study partners from your modules, schedule and study style.' },
];

const stats = [
  { n: '4,200+', label: 'catalogued assets' },
  { n: '34% → 70%', label: 'target utilisation' },
  { n: '200+/wk', label: 'bookings automated' },
  { n: '0', label: 'double-bookings' },
];

export default function Landing() {
  return (
    <Page>
      <div className="page" style={{ paddingTop: 130 }}>
        <div className="container">
          {/* ── hero ── */}
          <section style={{ textAlign: 'center', marginBottom: 90, position: 'relative' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.1 }}
              style={{ display: 'inline-block', marginBottom: 22, filter: 'drop-shadow(0 16px 40px color-mix(in srgb, var(--accent) 40%, transparent))' }}
            >
              <Logo size={84} />
            </motion.div>

            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span variants={fadeUp} className="chip brand" style={{ marginBottom: 18 }}>
                <Zap size={13} /> AI-Powered University Resource Sharing
              </motion.span>
              <motion.h1
                variants={fadeUp}
                style={{ fontSize: 'clamp(38px, 6.5vw, 72px)', fontWeight: 700, lineHeight: 1.05, margin: '14px auto 18px', maxWidth: 820 }}
              >
                Every campus resource,{' '}
                <span style={{ background: 'linear-gradient(120deg, var(--accent), var(--accent-2), var(--accent-3))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  one loop away
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} style={{ color: 'var(--ink-2)', fontSize: 18, maxWidth: 620, margin: '0 auto 32px', lineHeight: 1.65 }}>
                CampusLoop turns idle lab instruments, study rooms, cameras and bicycles into a trusted internal
                marketplace — with AI that makes discovery and condition assessment effortless.
              </motion.p>
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary" style={{ minHeight: 52, padding: '0 30px', fontSize: 16 }}>
                  Get started <ArrowRight size={17} />
                </Link>
                <Link to="/about" className="btn btn-glass" style={{ minHeight: 52, padding: '0 30px', fontSize: 16 }}>
                  Meet the team
                </Link>
              </motion.div>
            </motion.div>

            {/* floating 3D glass orbs */}
            <motion.div aria-hidden animate={{ y: [0, -18, 0], rotate: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
              className="glass" style={{ position: 'absolute', width: 88, height: 88, borderRadius: 28, left: '4%', top: '18%', display: 'grid', placeItems: 'center', transform: 'rotate(-8deg)' }}>
              <CalendarCheck size={30} color="var(--accent)" />
            </motion.div>
            <motion.div aria-hidden animate={{ y: [0, 16, 0], rotate: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 8.5, ease: 'easeInOut', delay: 1 }}
              className="glass" style={{ position: 'absolute', width: 76, height: 76, borderRadius: 24, right: '6%', top: '10%', display: 'grid', placeItems: 'center' }}>
              <Sparkles size={26} color="var(--accent-2)" />
            </motion.div>
            <motion.div aria-hidden animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.5 }}
              className="glass" style={{ position: 'absolute', width: 64, height: 64, borderRadius: 20, right: '12%', bottom: '-4%', display: 'grid', placeItems: 'center' }}>
              <Boxes size={24} color="var(--accent-3)" />
            </motion.div>
          </section>

          {/* ── stats ── */}
          <motion.section
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
            className="grid grid-4" style={{ marginBottom: 90 }}
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="glass" style={{ padding: '26px 22px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, background: 'linear-gradient(120deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.n}</div>
                <div style={{ color: 'var(--ink-2)', fontSize: 13.5, marginTop: 4 }}>{s.label}</div>
              </motion.div>
            ))}
          </motion.section>

          {/* ── features ── */}
          <section style={{ marginBottom: 90 }}>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} style={{ textAlign: 'center', marginBottom: 42 }}>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', marginBottom: 10 }}>Built for how campus actually works</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 16 }}>Six modules, three AI features, one seamless loop.</p>
            </motion.div>
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid grid-3">
              {features.map((f) => (
                <motion.div key={f.title} variants={fadeUp}>
                  <TiltCard style={{ padding: 26, height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'inline-flex', padding: 13, borderRadius: 16, background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 16%, transparent))', color: 'var(--accent)', marginBottom: 16 }}>
                      {f.icon}
                    </div>
                    <h3 style={{ fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
                    <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>{f.text}</p>
                  </TiltCard>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── trust ── */}
          <motion.section
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className="glass-strong" style={{ padding: 'clamp(28px, 5vw, 56px)', textAlign: 'center', marginBottom: 40 }}
          >
            <ShieldCheck size={38} color="var(--success)" style={{ marginBottom: 14 }} />
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', marginBottom: 12 }}>Trusted, accountable, university-grade</h2>
            <p style={{ color: 'var(--ink-2)', maxWidth: 640, margin: '0 auto 26px', lineHeight: 1.7 }}>
              University SSO with role and department claims, manager approvals for high-value gear,
              reputation-backed peer lending, and AI that gracefully steps aside when it's unavailable.
            </p>
            <Link to="/register" className="btn btn-primary" style={{ minHeight: 50, padding: '0 28px' }}>
              Join CampusLoop <ArrowRight size={16} />
            </Link>
          </motion.section>

          <footer style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '20px 0' }}>
            CampusLoop — Web Technologies Course Project · <Link to="/about" style={{ color: 'var(--accent)' }}>Team Unemployed Developers</Link>
          </footer>
        </div>
      </div>
    </Page>
  );
}
