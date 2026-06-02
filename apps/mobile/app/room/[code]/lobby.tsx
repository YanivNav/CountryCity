import { Share } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  ButtonText,
  Pressable,
  ScrollView,
  Avatar,
  AvatarFallbackText,
  Badge,
  BadgeText,
  Divider,
} from '@gluestack-ui/themed';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { MAX_WIDE_WIDTH, SCREEN_H_PAD } from '../../../lib/layout';
import * as Clipboard from 'expo-clipboard';

const BRAND = '$primary500';
const BRAND_HEX = '#3D2FCF';

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router   = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const room  = useGameStore((s) => s.room);
  const myId  = useUserStore((s) => s.id);

  const players  = room?.players ?? [];
  const isHost   = room?.hostId === myId;
  const canStart = isHost && players.length >= 2;

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) {
        clearTimeout(copiedResetTimer.current);
      }
    };
  }, []);

  async function copyCode() {
    await Clipboard.setStringAsync(code ?? '');
    setCopiedCode(true);

    if (copiedResetTimer.current) {
      clearTimeout(copiedResetTimer.current);
    }

    copiedResetTimer.current = setTimeout(() => {
      setCopiedCode(false);
      copiedResetTimer.current = null;
    }, 1400);
  }

  async function shareRoom() {
    try {
      await Share.share({
        message: `Join my Country City game!\nRoom code: ${code}\n\nOpen the app and tap "Join Game" to join.`,
        title: 'Country City – Join my room',
      });
    } catch { /* user cancelled */ }
  }

  return (
    <Box flex={1} bg="$backgroundLight50">

      {/* ── Header bar ────────────────────────────────────────── */}
      <Box bg="$white" borderBottomWidth={1} borderBottomColor="$borderLight200">
        <HStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pt={56}
          pb={16}
          alignItems="center"
          justifyContent="space-between"
        >
          <Pressable onPress={() => router.back()} p="$2" ml={-8}>
            <Text size="2xl" color={BRAND}>←</Text>
          </Pressable>
          <Heading size="md" color="$textLight900">Lobby</Heading>
          <Box w={40} />
        </HStack>
      </Box>

      {/* ── Scrollable content ────────────────────────────────── */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <VStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          py="$6"
          space="xl"
        >

          {/* Room Code card */}
          <Box
            bg="$white"
            borderRadius="$2xl"
            p="$6"
            alignItems="center"
            sx={{
              shadowColor: BRAND_HEX,
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <Text size="xs" fontWeight="$semibold" color="$textLight400"
              letterSpacing={1.5} textTransform="uppercase">
              Room Code
            </Text>

            <Text
              style={{ fontSize: 52, fontWeight: '900', letterSpacing: 8 }}
              color={BRAND}
              mt="$2"
              mb="$1"
            >
              {code}
            </Text>

            <Text size="sm" color="$textLight400" mb="$5">
              Share this code with friends
            </Text>

            <HStack space="md">
              <Button
                variant="outline"
                borderColor={BRAND}
                borderRadius="$lg"
                onPress={copyCode}
                sx={{ ':active': { bg: '$primary50' } }}
              >
                <ButtonText color={BRAND} fontWeight="$semibold">
                  {copiedCode ? '📋 Copied!' : '📋 Copy'}
                </ButtonText>
              </Button>

              <Button
                bg={BRAND}
                borderRadius="$lg"
                onPress={shareRoom}
                sx={{ ':active': { bg: '$primary600' } }}
              >
                <ButtonText fontWeight="$semibold">
                  🔗  Share
                </ButtonText>
              </Button>
            </HStack>
          </Box>

          {/* Players section */}
          <VStack space="md">
            <Heading size="sm" color="$textLight900">
              Players{players.length > 0 ? ` (${players.length})` : ''}
            </Heading>

            {players.length === 0 ? (
              <Box bg="$white" borderRadius="$xl" p="$5" alignItems="center">
                <Text color="$textLight400">Waiting for players to join…</Text>
              </Box>
            ) : (
              <VStack space="sm">
                {players.map((p, index) => (
                  <Box key={p.id}>
                    <HStack
                      bg="$white"
                      borderRadius="$xl"
                      p="$3"
                      alignItems="center"
                      space="md"
                    >
                      <Avatar size="md" bgColor={p.avatarColor as any}>
                        <AvatarFallbackText>{p.displayName}</AvatarFallbackText>
                      </Avatar>

                      <Text flex={1} fontWeight="$semibold" color="$textLight900">
                        {p.displayName}
                        {p.id === myId ? (
                          <Text color="$textLight400"> (You)</Text>
                        ) : null}
                      </Text>

                      {p.isHost && (
                        <Badge
                          action="info"
                          variant="solid"
                          size="sm"
                          borderRadius="$md"
                          bg="$primary50"
                        >
                          <BadgeText color={BRAND} fontWeight="$bold">
                            Host
                          </BadgeText>
                        </Badge>
                      )}
                    </HStack>
                    {index < players.length - 1 && <Divider bg="$backgroundLight100" />}
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>

        </VStack>
      </ScrollView>

      {/* ── Footer bar ────────────────────────────────────────── */}
      <Box bg="$white" borderTopWidth={1} borderTopColor="$borderLight200">
        <VStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pt="$4"
          pb="$9"
          space="sm"
        >
          {isHost ? (
            <Button
              size="lg"
              borderRadius="$xl"
              bg={BRAND}
              isDisabled={!canStart}
              onPress={() => { /* startGame — next phase */ }}
              sx={{ ':active': { bg: '$primary600' }, ':disabled': { opacity: 0.45 } }}
            >
              <ButtonText fontWeight="$bold">Start Game</ButtonText>
            </Button>
          ) : (
            <Box h={54} alignItems="center" justifyContent="center">
              <Text color="$textLight400">Waiting for host to start…</Text>
            </Box>
          )}

          {isHost && !canStart && (
            <Text size="sm" color="$textLight400" textAlign="center">
              Need at least 2 players to start
            </Text>
          )}
        </VStack>
      </Box>

    </Box>
  );
}
