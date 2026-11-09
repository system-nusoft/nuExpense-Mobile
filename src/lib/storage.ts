import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'nuexpense_access_token';
const REFRESH_KEY = 'nuexpense_refresh_token';
const USER_KEY = 'nuexpense_user';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_KEY, access);
  await AsyncStorage.setItem(REFRESH_KEY, refresh);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_KEY);
  await AsyncStorage.removeItem(REFRESH_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

export async function setStoredUser(user: object): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}
