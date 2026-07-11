import { AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import Discover from './pages/Discover';
import Landing from './pages/Landing';
import Lending from './pages/Lending';
import Login from './pages/Login';
import LostFound from './pages/LostFound';
import Manage from './pages/Manage';
import Register from './pages/Register';
import StudyGroups from './pages/StudyGroups';
import UsersAdmin from './pages/UsersAdmin';

/** Protected routing: unauthenticated users are redirected to /login. */
function Protected({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  const location = useLocation();
if (!user)
  return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/app/admin' : user.role === 'LOST_FOUND_OFFICER' ? '/app/lost-found' : user.role === 'STAFF' ? '/app/manage' : '/app'} replace />;
  }
  return <>{children}</>;
}

/** Students land on Discover; other roles on their primary workspace. */
function RoleHome() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/app" element={<Protected><RoleHome /></Protected>} />
          <Route path="/app/catalogue" element={<Protected><Catalogue /></Protected>} />
          <Route path="/app/assets/:id" element={<Protected><AssetDetail /></Protected>} />
          <Route path="/app/bookings" element={<Protected><Bookings /></Protected>} />
          <Route path="/app/lending" element={<Protected roles={['STUDENT']}><Lending /></Protected>} />
          <Route path="/app/lost-found" element={<Protected><LostFound /></Protected>} />
          <Route path="/app/study" element={<Protected roles={['STUDENT']}><StudyGroups /></Protected>} />
          <Route path="/app/manage" element={<Protected roles={['STAFF', 'ADMIN']}><Manage /></Protected>} />
          <Route path="/app/admin" element={<Protected roles={['ADMIN']}><AdminDashboard /></Protected>} />
          <Route path="/app/users" element={<Protected roles={['ADMIN']}><UsersAdmin /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      <Toasts />
    </>
  );
}
