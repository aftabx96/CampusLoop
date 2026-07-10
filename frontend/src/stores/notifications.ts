import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuth } from './auth';
import { useUi } from './ui';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface NotificationState {
  socket: Socket | null;
  items: AppNotification[];
  connect: () => void;
  disconnect: () => void;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  socket: null,
  items: [],

  connect: () => {
    const token = useAuth.getState().accessToken;
    if (!token || get().socket) return;
    const socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('notification', (n: AppNotification) => {
      set({ items: [n, ...get().items] });
      useUi.getState().toast('info', n.title);
    });
    socket.on('booking:pending', () => useUi.getState().toast('info', 'New booking awaiting approval'));
    socket.on('inspection:pending', () => useUi.getState().toast('info', 'Returned item awaiting inspection'));
    socket.on('lostfound:new-report', () => useUi.getState().toast('info', 'New lost item report'));
    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, items: [] });
  },

  load: async () => {
    const { data } = await api.get<AppNotification[]>('/notifications');
    set({ items: data });
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set({ items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
  },

  markAllRead: async () => {
    await api.patch('/notifications/read-all');
    set({ items: get().items.map((n) => ({ ...n, read: true })) });
  },
}));
