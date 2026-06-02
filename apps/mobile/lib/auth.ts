import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

export interface StoredUser {
  id: string;
  displayName: string;
  avatarColor: string;
}

export async function loginAnonymous(displayName: string) {
  const result = await apiFetch<{ token: string; user: StoredUser }>(
    '/auth/anonymous',
    { method: 'POST', body: JSON.stringify({ displayName }) },
  );
  await AsyncStorage.multiSet([
    [TOKEN_KEY, result.token],
    [USER_KEY, JSON.stringify(result.user)],
  ]);
  return result;
}

export async function loadStoredSession(): Promise<{ token: string; user: StoredUser } | null> {
  const [token, userJson] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token[1] || !userJson[1]) return null;
  try {
    return { token: token[1], user: JSON.parse(userJson[1]) as StoredUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
