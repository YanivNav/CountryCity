import Constants from 'expo-constants';

const DEFAULT_SERVER_PORT = '3001';

function getDevServerHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host || 'localhost';
}

export function getApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    `http://${getDevServerHost()}:${DEFAULT_SERVER_PORT}`
  );
}

export function getWebSocketBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_WS_URL ??
    `ws://${getDevServerHost()}:${DEFAULT_SERVER_PORT}`
  );
}
