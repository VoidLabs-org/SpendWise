import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'sw_access_token';
const REFRESH_KEY = 'sw_refresh_token';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
  ]);
}

export function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
