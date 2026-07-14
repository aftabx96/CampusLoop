import { ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Chatbot } from './components/Chatbot';
import { NavBar } from './components/NavBar';
import { Aurora, Toasts } from './components/ui';
import { useAuth } from './stores/auth';
import { useNotifications } from './stores/notifications';
import { useUi } from './stores/ui';

import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import AssetDetail from './pages/AssetDetail';
import Bookings from './pages/Bookings';
import Catalogue from './pages/Catalogue';
import Community from './pages/Community';
import Discover from './pages/Discover';
import Landing from './pages/Landing';
import Lending from './pages/Lending';
import Login from './pages/Login';
import LostFound from './pages/LostFound';
import Manage from './pages/Manage';
import Profile from './pages/Profile';
import Register from './pages/Register';
import StudyGroups from './pages/StudyGroups';
import UsersAdmin from './pages/UsersAdmin';

/** Protected routing: unauthenticated users are redirected to /login. */
function Protected({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/app/admin' : user.role === 'LOST_FOUND_OFFICER' ? '/app/lost-found' : user.role === 'STAFF' ? '/app/manage' : '/app'} replace />;
  }
  return <>{children}</>;
}

/**
 * Public-only routes (landing, login, register): an already-authenticated user
 * has no reason to see the marketing page or a login form, so send them straight
 * to their in-app home instead of prompting them to sign in/up again.
 */
function PublicOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Students land on Discover; other roles on their primary workspace. */
function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/app/admin" replace />;
  if (user.role === 'STAFF') return <Navigate to="/app/manage" replace />;
  if (user.role === 'LOST_FOUND_OFFICER') return <Navigate to="/app/lost-found" replace />;
  return <Discover />;
}

export default function App() {
  const { theme } = useUi();
  const { user } = useAuth();
  const { connect, disconnect } = useNotifications();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (user) connect();
    else disconnect();
  }, [user?.id]);

  return (
    <>
      <Aurora />
      <NavBar />
      {/* No AnimatePresence around route transitions on purpose: it wraps
          each page in an exit animation that must fire a completion callback
          before the next route mounts. In practice that callback could hang
          (an interrupted spring, a backgrounded tab, StrictMode's double
          render), which left navigation visibly stuck - the URL and router
          state updated correctly but the old page's DOM never changed until
          a manual refresh. Each page's own entrance animation (see the
          `Page` wrapper in components/ui.tsx) still runs on mount, so this
          only trades away the old page's exit fade, not the new page's
          entrance - a good trade for navigation that always works. */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        <Route path="/app" element={<Protected><RoleHome /></Protected>} />
        <Route path="/app/catalogue" element={<Protected><Catalogue /></Protected>} />
        <Route path="/app/assets/:id" element={<Protected><AssetDetail /></Protected>} />
        <Route path="/app/bookings" element={<Protected><Bookings /></Protected>} />
        <Route path="/app/community" element={<Protected><Community /></Protected>} />
        <Route path="/app/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/app/lending" element={<Protected roles={['STUDENT']}><Lending /></Protected>} />
        <Route path="/app/lost-found" element={<Protected><LostFound /></Protected>} />
        <Route path="/app/study" element={<Protected roles={['STUDENT']}><StudyGroups /></Protected>} />
        <Route path="/app/manage" element={<Protected roles={['STAFF', 'ADMIN']}><Manage /></Protected>} />
        <Route path="/app/admin" element={<Protected roles={['ADMIN']}><AdminDashboard /></Protected>} />
        <Route path="/app/users" element={<Protected roles={['ADMIN']}><UsersAdmin /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Chatbot />
      <Toasts />
    </>
  );
}
