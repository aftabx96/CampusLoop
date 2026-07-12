import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/NavBar';
import { Page, PasswordInput } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface Dept { id: string; name: string; faculty: string }

/** ID field label/placeholder adapts to the selected role - only students
 *  have a "student number" in the strict sense, but every role benefits
 *  from an optional identifying number. */
const idFieldByRole: Record<string, { label: string; placeholder: string }> = {
  STUDENT: { label: 'Student ID', placeholder: '2312398' },
  STAFF: { label: 'Staff ID', placeholder: 'STF-1042' },
  LOST_FOUND_OFFICER: { label: 'Officer ID', placeholder: 'OFC-118' },
};

export default function Register() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'STUDENT',
    departmentId: '', idNumber: '',
  });
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setTokens } = useAuth();
  const { toast } = useUi();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Dept[]>('/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        departmentId: form.departmentId || undefined,
        studentNumber: form.idNumber || undefined,
      });
      setTokens(data.accessToken, data.refreshToken, data.user);
      toast('success', 'Account created - welcome to CampusLoop!');
      navigate('/app');
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
          style={{ width: 'min(480px, calc(100vw - 32px))', padding: 'clamp(28px, 5vw, 44px)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <Logo size={48} />
            <h1 style={{ fontSize: 25, margin: '12px 0 6px' }}>Join CampusLoop</h1>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>University SSO simulation - role & department become JWT claims</p>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="fullName">Full name <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="fullName" className="input" required value={form.fullName} onChange={set('fullName')} placeholder="Aftab Ahmed Samoo" />
            </div>
            <div className="field">
              <label htmlFor="remail">University email <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="remail" className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} placeholder="you@szabist.edu.pk" />
              <span className="hint">Use your SZABIST address, e.g. name@szabist.pk or name@szabist.edu.pk</span>
            </div>
            <div className="field">
              <label htmlFor="rpassword">Password <span aria-hidden style={{ color: 'var(--danger)' }}>*</span></label>
              <PasswordInput id="rpassword" autoComplete="new-password" required value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
              <span className="hint">At least 8 characters</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label htmlFor="role">Role</label>
                <select id="role" className="input" value={form.role} onChange={set('role')}>
                  <option value="STUDENT">Student</option>
                  <option value="STAFF">Staff / Lab Manager</option>
                  <option value="LOST_FOUND_OFFICER">Lost & Found Officer</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="idNumber">{idFieldByRole[form.role].label} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
                <input id="idNumber" className="input" value={form.idNumber} onChange={set('idNumber')} placeholder={idFieldByRole[form.role].placeholder} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="dept">Department</label>
              <select id="dept" className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.faculty})</option>
                ))}
              </select>
            </div>
            {error && <p className="error" role="alert" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              <UserPlus size={16} /> {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--ink-2)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </Page>
  );
}
