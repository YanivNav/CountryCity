import * as Clipboard from 'expo-clipboard';
import { Box, Text, Pressable } from '@gluestack-ui/themed';

interface Props { code: string }

export function RoomCode({ code }: Props) {
  return (
    <Pressable onPress={() => Clipboard.setStringAsync(code)}>
      <Box
        bg="$primary50"
        borderRadius="$xl"
        px="$4"
        py="$3"
        alignItems="center"
      >
        <Text
          style={{ fontSize: 36, fontWeight: '900', letterSpacing: 6 }}
          color="$primary500"
        >
          {code}
        </Text>
      </Box>
    </Pressable>
  );
}
