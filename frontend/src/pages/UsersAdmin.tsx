import { motion } from 'framer-motion';
import { Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, Page, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useUi } from '../stores/ui';

interface UserRow {
  id: string; email: string; fullName: string; role: string; studentNumber?: string;
  reputationScore: number; ratingsCount: number; lendingEligible: boolean;
  department?: { name: string };
}

const roles = ['STUDENT', 'STAFF', 'LOST_FOUND_OFFICER', 'ADMIN'];
const roleChip: Record<string, string> = { ADMIN: 'bad', STAFF: 'brand', LOST_FOUND_OFFICER: 'warn', STUDENT: 'ok' };

export default function UsersAdmin() {
  const { toast } = useUi();
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = () => { api.get('/users').then(({ data }) => setUsers(data)).catch((e) => toast('error', errMsg(e))); };
  useEffect(load, []);

  const changeRole = async (u: UserRow, role: string) => {
    try {
      await api.patch(`/users/${u.id}/role`, { role });
      toast('success', `${u.fullName} is now ${role.replace(/_/g, ' ').toLowerCase()}`);
      load();
    } catch (err) { toast('error', errMsg(err)); }
  };

  return (
    <Page>
      <div className="page">
        <div className="container" style={{ maxWidth: 900 }}>
          <h1 className="page-title">User Management</h1>
          <p className="page-sub">All registered users, their roles and lending reputation.</p>

          {users.length === 0 ? (
            <EmptyState icon={<Users size={26} />} title="No users found" />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map((u) => (
                <motion.div key={u.id} variants={fadeUp} className="glass" style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '35%', display: 'grid', placeItems: 'center', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    {u.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14.5 }}>{u.fullName}</strong>
                      <span className={`chip ${roleChip[u.role]}`}>{u.role.replace(/_/g, ' ').toLowerCase()}</span>
                      {!u.lendingEligible && <span className="chip bad">lending blocked</span>}
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>
                      {u.email} · {u.department?.name ?? 'no department'}
                      {u.studentNumber && ` · #${u.studentNumber}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={13} fill="var(--warning)" color="var(--warning)" />
                    {Number(u.reputationScore).toFixed(1)} ({u.ratingsCount})
                  </span>
                  <select className="input" aria-label={`Role for ${u.fullName}`} style={{ minHeight: 38, fontSize: 13, padding: '4px 10px' }}
                    value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                    {roles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ').toLowerCase()}</option>)}
                  </select>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </Page>
  );
}
