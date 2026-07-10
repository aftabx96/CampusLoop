import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface UiState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      toasts: [],
      toast: (kind, text) => {
        const id = ++toastId;
        set({ toasts: [...get().toasts, { id, kind, text }] });
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    { name: 'campusloop-ui', partialize: (s) => ({ theme: s.theme }) },
  ),
);
