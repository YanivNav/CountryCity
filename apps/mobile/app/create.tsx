import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Box, Heading } from '@gluestack-ui/themed';

/**
 * The create flow now lives in the lobby's settings modal.
 * Redirect anyone who lands here back to home.
 */
export default function CreateScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <Box flex={1} bg="$backgroundLight50" alignItems="center" justifyContent="center">
      <Heading size="sm" color="$textLight400">
        Redirecting…
      </Heading>
    </Box>
  );
}
