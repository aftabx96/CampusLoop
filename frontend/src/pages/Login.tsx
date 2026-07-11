import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/NavBar';
import { Page } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setTokens } = useAuth();
  const { toast } = useUi();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setTokens(data.accessToken, data.refreshToken, data.user);
      toast('success', `Welcome back, ${data.user.fullName.split(' ')[0]}!`);
      navigate((location.state as any)?.from || '/app');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <div className="page" style={{ display: 'grid', placeItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="glass-strong"
          style={{ width: 'min(440px, calc(100vw - 32px))', padding: 'clamp(28px, 5vw, 44px)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo size={52} />
            <h1 style={{ fontSize: 26, margin: '14px 0 6px' }}>Welcome back</h1>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>Sign in with your university account</p>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">University email</label>
              <input id="email" className="input" type="email" autoComplete="email" required
                placeholder="you@szabist.edu.pk" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete="current-password" required
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <span className="error" role="alert">{error}</span>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 6 }}>
              <LogIn size={16} /> {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--ink-2)' }}>
            New here? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create an account</Link>
          </p>
        </motion.div>
      </div>
    </Page>
  );
}
