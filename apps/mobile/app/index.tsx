import { useState } from 'react';
import { Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  Input,
  InputField,
  AlertCircleIcon,
  KeyboardAvoidingView,
  ScrollView,
} from '@gluestack-ui/themed';
import { loginAnonymous } from '../lib/auth';
import { createRoom, getRoom } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { MAX_CONTENT_WIDTH, SCREEN_H_PAD } from '../lib/layout';

export default function HomeScreen() {
  const router = useRouter();
  const { setUser, setToken } = useUserStore();

  const [name, setName]       = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleCreateGame() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a display name.'); return; }
    setError(null);
    setCreating(true);
    try {
      const { token, user } = await loginAnonymous(trimmed);
      setUser(user);
      setToken(token);
      const room = await createRoom(token);
      router.push(`/room/${room.code}/lobby`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  }

  function handleJoinGame() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a display name.'); return; }
    setError(null);
    setRoomCode('');
    setRoomCodeError(null);
    setJoinModalOpen(true);
  }

  async function handleJoinRoom() {
    const trimmedName = name.trim();
    const normalizedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      setJoinModalOpen(false);
      setError('Please enter a display name.');
      return;
    }

    if (!normalizedCode) {
      setRoomCodeError('Please enter a room code.');
      return;
    }

    setRoomCodeError(null);
    setJoining(true);
    try {
      const { token, user } = await loginAnonymous(trimmedName);
      setUser(user);
      setToken(token);

      const room = await getRoom(normalizedCode, token);
      if (room.phase !== 'waiting') {
        setRoomCodeError('This game has already started.');
        return;
      }

      setJoinModalOpen(false);
      router.push(`/room/${room.code}/lobby`);
    } catch (err: unknown) {
      setRoomCodeError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <KeyboardAvoidingView
      flex={1}
      bg="$backgroundLight50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Centred card */}
        <Box
          style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
        >
          <VStack space="4xl">

            {/* ── Hero ───────────────────────────────────── */}
            <VStack space="xs" alignItems="center">
              <Text fontSize={72} lineHeight={80}>🌍</Text>
              <Heading size="3xl" color="$textLight900" textAlign="center">
                Country City
              </Heading>
              <Text size="md" color="$textLight500" textAlign="center">
                The word game for everyone
              </Text>
            </VStack>

            {/* ── Form ───────────────────────────────────── */}
            <VStack space="md">
              <FormControl isInvalid={!!error}>
                <FormControlLabel mb="$1">
                  <FormControlLabelText fontWeight="$semibold">
                    Your name
                  </FormControlLabelText>
                </FormControlLabel>

                <Input size="lg" borderRadius="$xl" borderColor="$borderLight200">
                  <InputField
                    placeholder="Enter your display name…"
                    value={name}
                    onChangeText={(v) => { setName(v); setError(null); }}
                    autoCorrect={false}
                    maxLength={24}
                    returnKeyType="done"
                    onSubmitEditing={handleCreateGame}
                    bg="$white"
                  />
                </Input>

                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              </FormControl>

              {/* Create Game — primary */}
              <Button
                size="lg"
                borderRadius="$xl"
                bg="$primary500"
                isDisabled={creating}
                onPress={handleCreateGame}
                sx={{ ':active': { bg: '$primary600' }, ':disabled': { opacity: 0.55 } }}
              >
                {creating
                  ? <ButtonSpinner color="$white" />
                  : <ButtonText fontWeight="$bold">Create Game</ButtonText>
                }
              </Button>

              {/* Join Game — outline */}
              <Button
                size="lg"
                borderRadius="$xl"
                variant="outline"
                borderColor="$primary500"
                isDisabled={creating || joining}
                onPress={handleJoinGame}
                sx={{ ':active': { bg: '$primary50' } }}
              >
                <ButtonText color="$primary500" fontWeight="$bold">
                  Join Game
                </ButtonText>
              </Button>
            </VStack>

          </VStack>
        </Box>
      </ScrollView>

      <Modal
        visible={joinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!joining) setJoinModalOpen(false);
        }}
      >
        <Box
          flex={1}
          bg="rgba(0, 0, 0, 0.42)"
          px={SCREEN_H_PAD}
          justifyContent="center"
        >
          <Box
            bg="$white"
            borderRadius="$xl"
            p="$5"
            style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}
          >
            <VStack space="lg">
              <VStack space="xs">
                <Heading size="lg" color="$textLight900">
                  Join Game
                </Heading>
                <Text size="sm" color="$textLight500">
                  Enter the room code your friend shared.
                </Text>
              </VStack>

              <FormControl isInvalid={!!roomCodeError}>
                <FormControlLabel mb="$1">
                  <FormControlLabelText fontWeight="$semibold">
                    Room code
                  </FormControlLabelText>
                </FormControlLabel>

                <Input size="lg" borderRadius="$xl" borderColor="$borderLight200">
                  <InputField
                    placeholder="ABC123"
                    value={roomCode}
                    onChangeText={(v) => {
                      setRoomCode(v.toUpperCase());
                      setRoomCodeError(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    returnKeyType="join"
                    onSubmitEditing={handleJoinRoom}
                    bg="$white"
                  />
                </Input>

                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>{roomCodeError}</FormControlErrorText>
                </FormControlError>
              </FormControl>

              <VStack space="sm">
                <Button
                  size="lg"
                  borderRadius="$xl"
                  bg="$primary500"
                  isDisabled={joining}
                  onPress={handleJoinRoom}
                  sx={{ ':active': { bg: '$primary600' }, ':disabled': { opacity: 0.55 } }}
                >
                  {joining
                    ? <ButtonSpinner color="$white" />
                    : <ButtonText fontWeight="$bold">Join Lobby</ButtonText>
                  }
                </Button>

                <Button
                  size="lg"
                  borderRadius="$xl"
                  variant="outline"
                  borderColor="$borderLight300"
                  isDisabled={joining}
                  onPress={() => setJoinModalOpen(false)}
                  sx={{ ':active': { bg: '$backgroundLight100' } }}
                >
                  <ButtonText color="$textLight600" fontWeight="$semibold">
                    Cancel
                  </ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Box>
        </Box>
      </Modal>
    </KeyboardAvoidingView>
  );
}
