import axios from 'axios';
import { useAuth } from '../stores/auth';

/** All requests go through the NestJS backend; the AI proxy lives there -
 *  the frontend never holds AI API keys (spec constraint 5.1). */
export const api = axios.create({ baseURL: '/api-proxy' });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const { refreshToken, setTokens, logout } = useAuth.getState();
    if (error.response?.status === 401 && refreshToken && !original._retried) {
      original._retried = true;
      refreshing ??= axios
        .post('/api-proxy/auth/refresh', { refreshToken })
        .then(({ data }) => setTokens(data.accessToken, data.refreshToken, data.user))
        .catch(() => logout())
        .finally(() => (refreshing = null)) as Promise<void>;
      await refreshing;
      const fresh = useAuth.getState().accessToken;
      if (fresh) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export const errMsg = (e: unknown): string => {
  const m = (e as any)?.response?.data?.message;
  return Array.isArray(m) ? m[0] : m || 'Something went wrong';
};
