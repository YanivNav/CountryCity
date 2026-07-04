import type { Room } from '@country-city/shared';
import { getApiBaseUrl } from './serverUrl';

const BASE = getApiBaseUrl();
const DEFAULT_TIMEOUT_MS = 8_000;

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string; timeoutMs?: number },
): Promise<T> {
  const { token, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = options ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${BASE}${path}`;

  try {
    console.log('[apiFetch]', url);

    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    });

    if (!res.ok) {
      // 5xx → generic message so we don't leak internals
      if (res.status >= 500) {
        throw new Error('An internal error occurred, please try again later.');
      }
      // 4xx → try to surface the server's message (e.g. validation errors)
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { message?: string };
        throw new Error(json.message ?? 'Something went wrong, please try again later.');
      } catch {
        throw new Error(text || 'Something went wrong, please try again later.');
      }
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      console.log(JSON.stringify(err.message));
      if (err.name === 'AbortError' || err instanceof TypeError) {
        throw new Error('Cannot reach the server, please try again later.');
      }
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function createRoom(token: string) {
  return apiFetch<Room>('/rooms', {
    method: 'POST',
    token,
  });
}

export async function updateRoomSettings(
  code: string,
  token: string,
  settings: Partial<Room['settings']>,
) {
  return apiFetch<Room>(`/rooms/${code}/settings`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(settings),
  });
}

export async function getRoom(code: string, token: string) {
  return apiFetch<Room>(`/rooms/${code}`, { token });
}
