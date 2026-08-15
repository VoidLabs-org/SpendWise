import { Platform } from 'react-native';

const AUTH_PORT = 8080;

// Android emulators can't reach the host machine via `localhost` — 10.0.2.2 is the
// emulator's alias for it. Physical devices need the host's real LAN IP, which can't
// be auto-detected, so EXPO_PUBLIC_AUTH_API_URL overrides this for that case.
function defaultAuthApiUrl() {
  if (Platform.OS === 'android') return `http://10.0.2.2:${AUTH_PORT}`;
  return `http://localhost:${AUTH_PORT}`;
}

export const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || defaultAuthApiUrl();
