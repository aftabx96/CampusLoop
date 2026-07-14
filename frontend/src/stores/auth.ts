import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'STUDENT' | 'STAFF' | 'LOST_FOUND_OFFICER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
  faculty: string | null;
  department: string | null;
  reputationScore: number;
  studentNumber?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (access: string, refresh: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'campusloop-auth' },
  ),
);
