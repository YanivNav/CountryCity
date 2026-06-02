import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { gluestackConfig } from '../gluestack.config';
import { loadStoredSession } from '../lib/auth';
import { useUserStore } from '../stores/userStore';

export default function RootLayout() {
  const { setUser, setToken } = useUserStore();

  useEffect(() => {
    loadStoredSession().then((session) => {
      if (session) {
        setUser(session.user);
        setToken(session.token);
      }
    });
  }, []);

  return (
    <GluestackUIProvider config={gluestackConfig}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="join" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="room" />
      </Stack>
    </GluestackUIProvider>
  );
}
