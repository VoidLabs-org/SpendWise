import { Platform } from 'react-native';

const AUTH_PORT = 8080;
const GATEWAY_PORT = 8000;

// Android emulators can't reach the host machine via `localhost` — 10.0.2.2 is the
// emulator's alias for it. Physical devices need the host's real LAN IP, which can't
// be auto-detected, so EXPO_PUBLIC_AUTH_API_URL overrides this for that case.
function defaultAuthApiUrl() {
  if (Platform.OS === 'android') return `http://10.0.2.2:${AUTH_PORT}`;
  return `http://localhost:${AUTH_PORT}`;
}

function defaultGatewayApiUrl() {
  if (Platform.OS === 'android') return `http://10.0.2.2:${GATEWAY_PORT}`;
  return `http://localhost:${GATEWAY_PORT}`;
}

export const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || defaultAuthApiUrl();

// All non-auth routes (/vehicle/*, /finance/*, /notifications/*) are proxied by the API
// Gateway, which validates the JWT and injects X-User-Id downstream — so the app talks to
// the gateway, not each service directly. GATEWAY_API_URL is the same value as
// VEHICLE_API_URL; the latter name is kept for the existing vehicleApi.ts call sites.
export const GATEWAY_API_URL = process.env.EXPO_PUBLIC_GATEWAY_API_URL || defaultGatewayApiUrl();
export const VEHICLE_API_URL = GATEWAY_API_URL;
