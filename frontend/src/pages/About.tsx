import { motion } from 'framer-motion';
import { BookOpen, Code2, GraduationCap, Heart, Palette, Server } from 'lucide-react';
import { Page, TiltCard, fadeUp, stagger } from '../components/ui';

const team = [
  {
    name: 'Aftab Ahmed Samoo',
    id: '#2312398',
    role: 'Full-Stack Developer',
    icon: <Server size={26} />,
    grad: 'linear-gradient(135deg, #3d6ef7, #22b8cf)',
    initials: 'AS',
  },
  {
    name: 'Javeria Masroor',
    id: '#2312400',
    role: 'Full-Stack Developer',
    icon: <Palette size={26} />,
    grad: 'linear-gradient(135deg, #7c5cfc, #e561b8)',
    initials: 'JM',
  },
  {
    name: 'Laiba Aamir',
    id: '#2312398',
    role: 'Full-Stack Developer',
    icon: <Code2 size={26} />,
    grad: 'linear-gradient(135deg, #22b8cf, #2f9e6e)',
    initials: 'LA',
  },
];

export default function About() {
  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 960 }}>
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ textAlign: 'center', marginBottom: 56 }}>
            <motion.span variants={fadeUp} className="chip brand"><Heart size={13} /> About the team</motion.span>
            <motion.h1 variants={fadeUp} className="page-title" style={{ fontSize: 'clamp(32px, 5vw, 52px)', margin: '16px 0 10px' }}>
              Unemployed{' '}
              <span style={{ background: 'linear-gradient(120deg, var(--accent), var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Developers
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} style={{ color: 'var(--ink-2)', fontSize: 17, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Three students of <strong>SZABIST</strong> who decided that if the job market won't loop us in,
              we'll build our own loop — CampusLoop.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-3" style={{ marginBottom: 56 }}>
            {team.map((m, i) => (
              <motion.div key={m.name} variants={fadeUp}>
                <TiltCard style={{ padding: 30, textAlign: 'center', height: '100%' }}>
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4 + i, ease: 'easeInOut', delay: i * 0.4 }}
                    style={{
                      width: 92, height: 92, borderRadius: '32%', margin: '0 auto 18px',
                      background: m.grad, display: 'grid', placeItems: 'center', color: '#fff',
                      fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                      boxShadow: '0 16px 36px rgba(23,35,76,0.25), inset 0 2px 0 rgba(255,255,255,0.35)',
                    }}
                  >
                    {m.initials}
                  </motion.div>
                  <h3 style={{ fontSize: 19, marginBottom: 4 }}>{m.name}</h3>
                  <div className="chip brand" style={{ marginBottom: 10 }}>{m.id}</div>
                  <p style={{ color: 'var(--ink-2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {m.icon} {m.role}
                  </p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="glass-strong" style={{ padding: 'clamp(28px, 4vw, 44px)', textAlign: 'center' }}
          >
            <GraduationCap size={34} color="var(--accent)" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>The course behind the project</h2>
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
              CampusLoop was built as the course project for <strong>Web Technologies</strong> at SZABIST,
              under the guidance of our instructor <strong>Mustafa Hassan</strong>. It is a full-stack
              platform — React 18, NestJS, PostgreSQL, WebSockets and an AI proxy — modelling a real
              university resource-sharing marketplace for the fictional Meridian University.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
              {['React 18', 'TypeScript', 'NestJS', 'PostgreSQL 15', 'Socket.io', 'JWT Auth', 'LLM AI', 'Docker'].map((t) => (
                <span key={t} className="chip"><BookOpen size={12} /> {t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Page>
  );
}
