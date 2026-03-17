import { Platform } from 'react-native';

// Android emulator → 10.0.2.2 maps to host machine localhost
// Real device      → change to your LAN IP, e.g. http://192.168.1.100:5076
// iOS simulator    → localhost works directly
// Web              → localhost works directly
const HOST = Platform.select({
  android: '192.168.1.74',  // LAN IP for real device via Expo Go
  default: 'localhost',
});

export const BASE_URL = `http://${HOST}:5076`;
export const HUB_URL  = `${BASE_URL}/chathub`;
