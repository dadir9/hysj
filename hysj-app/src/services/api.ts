import axios, { AxiosError } from 'axios';
import { BASE_URL as BASE } from './config';
import { getSession, saveSession } from './auth';

const BASE_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Attach JWT automatically
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

// Token refresh on 401
let isRefreshing = false;
let failedQueue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(undefined)));
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status !== 401 || originalRequest._retry || originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const session = await getSession();
      if (!session?.refreshToken) {
        processQueue(error);
        return Promise.reject(error);
      }

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: session.refreshToken,
      });

      await saveSession({
        ...session,
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });

      processQueue(null);
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Auth ──────────────────────────────────────────────
export const register = (data: {
  username: string;
  phoneNumber: string;
  password: string;
  identityPublicKey: string;
  identityDhPublicKey?: string;
  deviceName: string;
  signedPreKey: string;
  signedPreKeySig: string;
  oneTimePreKeys: string[];
  kyberPublicKey?: string;
}) => api.post('/auth/register', data);

export const login = (data: {
  phoneNumber: string;
  password: string;
  totpCode?: string | null;
}) => api.post('/auth/login', data);

export const toggle2FA = (data: { enable: boolean; totpCode?: string | null }) =>
  api.post('/auth/toggle-2fa', data);

export const getSenderCertificate = () =>
  api.post('/auth/sender-certificate');

// ── Keys ──────────────────────────────────────────────
export const uploadPreKeys = (deviceId: string, publicKeys: string[]) =>
  api.post(`/keys/${deviceId}/prekeys`, publicKeys);

export const getPreKeyBundle = (deviceId: string) =>
  api.get(`/keys/${deviceId}`);

export const getPreKeyCount = (deviceId: string) =>
  api.get(`/keys/${deviceId}/prekeys/count`);

// ── Devices ───────────────────────────────────────────
export const getDevices = () => api.get('/devices');
export const registerDevice = (data: {
  deviceName: string;
  pushToken?: string | null;
  signedPreKey: string;      // base64 — backend expects byte[] (JSON base64)
  signedPreKeySig: string;   // base64
  oneTimePreKeys: string[];  // base64[]
}) => api.post('/devices', data);
export const deleteDevice = (deviceId: string) =>
  api.delete(`/devices/${deviceId}`);
export const updatePushToken = (deviceId: string, pushToken: string) =>
  api.patch(`/devices/${deviceId}/push-token`, JSON.stringify(pushToken), {
    headers: { 'Content-Type': 'application/json' },
  });

// ── Groups ────────────────────────────────────────────
export const createGroup = (data: {
  name: string;
  isAnonymous: boolean;
  membersCanAdd: boolean;
  initialMemberUserIds?: string[];
}) => api.post('/groups', data);

export const getGroups = () => api.get('/groups');
export const getGroup = (id: string) => api.get(`/groups/${id}`);
export const deleteGroup = (id: string) => api.delete(`/groups/${id}`);
export const addMember = (id: string, userId: string) =>
  api.post(`/groups/${id}/members`, userId, {
    headers: { 'Content-Type': 'application/json' },
  });
export const removeMember = (groupId: string, userId: string) =>
  api.delete(`/groups/${groupId}/members/${userId}`);
export const leaveGroup = (id: string) =>
  api.post(`/groups/${id}/leave`);

// ── Wipe ──────────────────────────────────────────────
// WipeType enum: Conversation=0, Device=1, All=2
export const wipeAll = (totpCode: string) =>
  api.post('/wipe', { type: 2, totpCode });
export const wipeConversation = (conversationPartnerId: string, totpCode: string) =>
  api.post('/wipe', { type: 0, conversationPartnerId, totpCode });
export const wipeDevice = (targetDeviceId: string, totpCode: string) =>
  api.post('/wipe', { type: 1, targetDeviceId, totpCode });

// ── Relay ─────────────────────────────────────────────
// Backend returns { address, publicKey } where publicKey is base64 (C# byte[] → JSON base64)
export const getRelayNodes = () =>
  api.get<{ address: string; publicKey: string }[]>('/relay/nodes');

// ── Users ──────────────────────────────────────────────
export const lookupUser = (username: string) =>
  api.get<{ id: string; username: string; deviceIds: string[] }>(`/users/lookup?username=${encodeURIComponent(username)}`);

export const getUserStatus = (userId: string) =>
  api.get<{ isOnline: boolean; lastSeenAt: string }>(`/users/${userId}/status`);

export const getUserStatusBatch = (userIds: string[]) =>
  api.post<{ userId: string; isOnline: boolean; lastSeenAt: string | null }[]>(
    '/users/status-batch',
    userIds,
  );

export default api;
