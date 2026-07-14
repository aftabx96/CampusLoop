import { motion } from 'framer-motion';
import { KeyRound, Save, ShieldCheck, Star, UserCog } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Page, PasswordInput, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { AuthUser, useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

const roleLabel: Record<string, string> = {
  STUDENT: 'Student',
  STAFF: 'Staff / Lab Manager',
  LOST_FOUND_OFFICER: 'Lost & Found Officer',
  ADMIN: 'Administrator',
};

const idLabelByRole: Record<string, string> = {
  STUDENT: 'Student ID',
  STAFF: 'Staff ID',
  LOST_FOUND_OFFICER: 'Officer ID',
  ADMIN: 'Admin ID',
};

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useUi();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [studentNumber, setStudentNumber] = useState(user?.studentNumber ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const dirty = fullName.trim() !== user.fullName || (studentNumber ?? '') !== (user.studentNumber ?? '');

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.patch<AuthUser>('/users/me', {
        fullName: fullName.trim(),
        studentNumber: studentNumber.trim(),
      });
      setUser(data);
      toast('success', 'Profile updated');
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('error', 'New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/users/me/password', { currentPassword, newPassword });
      toast('success', 'Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Page>
      <div className="page" style={{ paddingTop: 96 }}>
        <div className="container" style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: 22 }}>
            <h1 className="page-title">Your profile</h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              Manage your account details and password.
            </p>
          </div>

          <motion.div variants={stagger} initial="hidden" animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* identity header */}
            <motion.div variants={fadeUp} className="glass-strong"
              style={{ padding: 22, borderRadius: 22, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div aria-hidden style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                color: '#fff', fontSize: 22, fontWeight: 700,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              }}>
                {initials(user.fullName)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 20, marginBottom: 4 }}>{user.fullName}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="chip brand">{roleLabel[user.role] ?? user.role}</span>
                  {user.department && <span className="chip">{user.department}</span>}
                  {user.role === 'STUDENT' && (
                    <span className="chip" style={{ gap: 5 }}>
                      <Star size={12} /> {Number(user.reputationScore).toFixed(1)} reputation
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* editable details */}
            <motion.form variants={fadeUp} onSubmit={saveProfile} className="glass" style={{ padding: 24, borderRadius: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                <UserCog size={18} color="var(--accent)" />
                <h3 style={{ fontSize: 17 }}>Account details</h3>
              </div>

              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required minLength={2} placeholder="Your name" />
              </div>

              <div className="field">
                <label htmlFor="idNumber">{idLabelByRole[user.role] ?? 'ID number'}</label>
                <input id="idNumber" className="input" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g. 2312398" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label htmlFor="email">University email</label>
                  <input id="email" className="input" value={user.email} disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div className="field">
                  <label htmlFor="dept">Department</label>
                  <input id="dept" className="input" value={user.department ?? 'Not set'} disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: -6, marginBottom: 16 }}>
                Email and department are set by the university and cannot be changed here.
              </p>

              <button className="btn btn-primary" type="submit" disabled={savingProfile || !dirty}>
                <Save size={16} /> {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </motion.form>

            {/* password change */}
            <motion.form variants={fadeUp} onSubmit={savePassword} className="glass" style={{ padding: 24, borderRadius: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                <KeyRound size={18} color="var(--accent)" />
                <h3 style={{ fontSize: 17 }}>Change password</h3>
              </div>

              <div className="field">
                <label htmlFor="currentPassword">Current password</label>
                <PasswordInput id="currentPassword" autoComplete="current-password" required
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label htmlFor="newPassword">New password</label>
                  <PasswordInput id="newPassword" autoComplete="new-password" required minLength={8}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirm new</label>
                  <PasswordInput id="confirmPassword" autoComplete="new-password" required minLength={8}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16 }}>
                <ShieldCheck size={14} color="var(--success)" /> Your password is hashed with bcrypt and never stored in plain text.
              </div>

              <button className="btn btn-primary" type="submit"
                disabled={savingPassword || !currentPassword || !newPassword}>
                <KeyRound size={16} /> {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </motion.form>
          </motion.div>
        </div>
      </div>
    </Page>
  );
}
