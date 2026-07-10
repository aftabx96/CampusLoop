import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, Boxes, CalendarCheck, GraduationCap, HandHeart, PieChart,
  LayoutDashboard, LogOut, Moon, Search, SearchX, Sun, Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { useNotifications } from '../stores/notifications';
import { useUi } from '../stores/ui';

const linksByRole: Record<string, Array<{ to: string; label: string; icon: JSX.Element }>> = {
  STUDENT: [
    { to: '/app', label: 'Discover', icon: <Search size={16} /> },
    { to: '/app/catalogue', label: 'Catalogue', icon: <Boxes size={16} /> },
    { to: '/app/bookings', label: 'Bookings', icon: <CalendarCheck size={16} /> },
    { to: '/app/lending', label: 'Peer Lending', icon: <HandHeart size={16} /> },
    { to: '/app/lost-found', label: 'Lost & Found', icon: <SearchX size={16} /> },
    { to: '/app/study', label: 'Study Groups', icon: <GraduationCap size={16} /> },
  ],
  STAFF: [
    { to: '/app/manage', label: 'Manage', icon: <LayoutDashboard size={16} /> },
    { to: '/app/catalogue', label: 'Catalogue', icon: <Boxes size={16} /> },
    { to: '/app/bookings', label: 'Bookings', icon: <CalendarCheck size={16} /> },
    { to: '/app/lost-found', label: 'Lost & Found', icon: <SearchX size={16} /> },
  ],
  LOST_FOUND_OFFICER: [
    { to: '/app/lost-found', label: 'Lost & Found', icon: <SearchX size={16} /> },
    { to: '/app/catalogue', label: 'Catalogue', icon: <Boxes size={16} /> },
  ],
  ADMIN: [
    { to: '/app/admin', label: 'Analytics', icon: <PieChart size={16} /> },
    { to: '/app/catalogue', label: 'Catalogue', icon: <Boxes size={16} /> },
    { to: '/app/manage', label: 'Approvals', icon: <LayoutDashboard size={16} /> },
    { to: '/app/users', label: 'Users', icon: <Users size={16} /> },
  ],
};

export function NavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useUi();
  const { items, load, markRead, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (user) load().catch(() => {});
  }, [user]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const links = user ? (linksByRole[user.role] ?? []) : [];

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      style={{ position: 'fixed', top: 14, left: 0, right: 0, zIndex: 900, pointerEvents: 'none' }}
    >
      <nav
        className="glass-strong container"
        style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999 }}
        aria-label="Main navigation"
      >
        <NavLink to={user ? '/app' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 8 }}>
          <Logo />
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>CampusLoop</strong>
        </NavLink>

        <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }} className="nav-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/app'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999,
                fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
                color: isActive ? '#fff' : 'var(--ink-2)',
                background: isActive ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                boxShadow: isActive ? '0 6px 18px color-mix(in srgb, var(--accent) 35%, transparent)' : 'none',
                transition: 'all 220ms var(--ease-spring)',
              })}
            >
              {l.icon} <span className="nav-label">{l.label}</span>
            </NavLink>
          ))}
        </div>

        <button className="btn btn-glass btn-sm" onClick={toggleTheme} aria-label="Toggle dark mode" style={{ borderRadius: '50%', width: 38, height: 38, padding: 0 }}>
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-glass btn-sm"
              onClick={() => setBellOpen(!bellOpen)}
              aria-label={`Notifications, ${unread} unread`}
              style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, position: 'relative' }}
            >
              <Bell size={16} />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px' }}
                >
                  {unread}
                </motion.span>
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="glass-strong"
                  style={{ position: 'absolute', right: 0, top: 48, width: 340, maxHeight: 420, overflowY: 'auto', padding: 14, borderRadius: 22 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>Notifications</strong>
                    <button onClick={() => markAllRead()} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                      Mark all read
                    </button>
                  </div>
                  {items.length === 0 && <p style={{ color: 'var(--ink-3)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>Nothing yet — bookings and matches will appear here in real time.</p>}
                  {items.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', background: n.read ? 'transparent' : 'color-mix(in srgb, var(--accent) 8%, transparent)',
                        border: 'none', borderRadius: 12, padding: '10px 12px', marginBottom: 4, color: 'var(--ink)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{n.body}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {user ? (
          <button
            className="btn btn-glass btn-sm"
            onClick={() => { logout(); navigate('/'); }}
            aria-label="Log out"
            style={{ gap: 6 }}
          >
            <LogOut size={15} /> <span className="nav-label">{user.fullName.split(' ')[0]}</span>
          </button>
        ) : (
          <NavLink to="/login" className="btn btn-primary btn-sm">Sign in</NavLink>
        )}
      </nav>
      <style>{`
        .nav-links::-webkit-scrollbar { display: none; }
        @media (max-width: 760px) { .nav-label { display: none; } }
      `}</style>
    </motion.header>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#lg)" strokeWidth="13" strokeLinecap="round" strokeDasharray="200 51" transform="rotate(-45 50 50)" />
      <circle cx="79" cy="24" r="13" fill="var(--accent-2)" />
    </svg>
  );
}
