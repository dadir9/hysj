import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession } from '../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const saveSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem('deviceId', session.deviceId);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(session));
};

export const getDeviceId = async (): Promise<string | null> =>
  AsyncStorage.getItem('deviceId');

export const getSession = async (): Promise<AuthSession | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, 'deviceId']);
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const getAvatarColor = (name: string) => {
  const colors = [
    '#7C3AED', '#2563EB', '#0D9488', '#DC2626',
    '#D97706', '#059669', '#4338CA', '#BE185D',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};
