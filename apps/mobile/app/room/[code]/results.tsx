import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  ButtonText,
  ScrollView,
  Avatar,
  AvatarFallbackText,
  Pressable,
  Divider,
} from '@gluestack-ui/themed';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { socketEmit } from '../../../lib/socket';
import { Podium } from '../../../components/game/Podium';
import { MAX_WIDE_WIDTH, SCREEN_H_PAD } from '../../../lib/layout';

const BRAND = '$primary500';

export default function ResultsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const room = useGameStore((s) => s.room);
  const scores = useGameStore((s) => s.scores);
  const myId = useUserStore((s) => s.id);

  const isHost = room?.hostId === myId;

  // ── Prevent navigating away before the results have been shown ──
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // ── Expanded round breakdown per player ──
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(userId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  // ── Navigate back to lobby when host triggers Play Again ──
  useEffect(() => {
    if (!mounted.current) return; // don't navigate on initial mount
    if (room?.phase === 'waiting') {
      router.replace(`/room/${code}/lobby`);
    }
  }, [room?.phase, code]);

  // ── Round label from breakdown data ──
  const maxRounds = useMemo(() => {
    let max = 0;
    for (const s of scores) {
      for (const r of s.roundBreakdown) {
        if (r.round > max) max = r.round;
      }
    }
    return max;
  }, [scores]);

  // ── Loading / empty state ──
  if (scores.length === 0) {
    return (
      <Box flex={1} bg="$backgroundLight50" alignItems="center" justifyContent="center">
        <Heading size="sm" color="$textLight400">
          Calculating scores…
        </Heading>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <Box bg="$white" borderBottomWidth={1} borderBottomColor="$borderLight200">
        <HStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pt={56}
          pb={16}
          alignItems="center"
          justifyContent="space-between"
        >
          <Pressable onPress={() => router.replace('/')} p="$2" ml={-8}>
            <Text size="2xl" color={BRAND}>←</Text>
          </Pressable>
          <Heading size="md" color="$textLight900">
            Game Over
          </Heading>
          <Box w={40} />
        </HStack>
      </Box>

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <VStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          space="xl"
        >
          {/* ── Podium ──────────────────────────────────────── */}
          {scores.length >= 1 && <Podium scores={scores} />}

          {/* ── Full leaderboard ────────────────────────────── */}
          <VStack space="sm" pb="$4">
            <Heading size="sm" color="$textLight900">
              Leaderboard
            </Heading>

            {scores.map((player, index) => {
              const isExpanded = expanded.has(player.userId);
              const isMe = player.userId === myId;

              return (
                <Pressable
                  key={player.userId}
                  onPress={() => toggleExpand(player.userId)}
                >
                  <Box
                    bg={isMe ? '$primary50' : '$white'}
                    borderRadius="$xl"
                    p="$3"
                    borderWidth={isMe ? 1 : 0}
                    borderColor={isMe ? '$primary200' : 'transparent'}
                  >
                    <HStack alignItems="center" space="md">
                      {/* Rank */}
                      <Box
                        w={28}
                        h={28}
                        borderRadius="$full"
                        bg={index === 0 ? '#FFF9E6' : index === 1 ? '#F8F9FA' : index === 2 ? '#FFF5EE' : '$borderLight100'}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text
                          size="xs"
                          fontWeight="$bold"
                          color={index === 0 ? '#D4A017' : index === 1 ? '#8E8E93' : index === 2 ? '#CD7F32' : '$textLight500'}
                        >
                          {index + 1}
                        </Text>
                      </Box>

                      {/* Avatar */}
                      <Avatar size="sm" bgColor={player.avatarColor as any}>
                        <AvatarFallbackText>{player.displayName}</AvatarFallbackText>
                      </Avatar>

                      {/* Name */}
                      <Text
                        flex={1}
                        fontWeight="$semibold"
                        color="$textLight900"
                        numberOfLines={1}
                      >
                        {player.displayName}
                        {isMe ? (
                          <Text color="$textLight400"> (You)</Text>
                        ) : null}
                      </Text>

                      {/* Score */}
                      <Text
                        size="lg"
                        fontWeight="$extrabold"
                        color="$primary500"
                      >
                        {player.totalPoints}
                      </Text>

                      {/* Expand chevron */}
                      <Text color="$textLight400">
                        {isExpanded ? '▾' : '▸'}
                      </Text>
                    </HStack>

                    {/* ── Round breakdown (expandable) ── */}
                    {isExpanded && player.roundBreakdown.length > 0 && (
                      <VStack mt="$3" space="xs">
                        <Divider bg="$borderLight100" />
                        {player.roundBreakdown.map((r) => (
                          <HStack
                            key={r.round}
                            mt="$2"
                            justifyContent="space-between"
                            px="$2"
                          >
                            <Text size="xs" color="$textLight400">
                              Round {r.round}
                            </Text>
                            <Text size="xs" fontWeight="$semibold" color="$textLight900">
                              +{r.points}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </Pressable>
              );
            })}

            {/* Total rounds played */}
            {maxRounds > 0 && (
              <Text size="xs" color="$textLight400" textAlign="center" mt="$2">
                {maxRounds} round{maxRounds > 1 ? 's' : ''} played
              </Text>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* ── Footer: Play Again + Home ─────────────────────────── */}
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
              onPress={() => { socketEmit.playAgain(); router.replace(`/room/${code}/lobby`); }}
              sx={{ ':active': { bg: '$primary600' } }}
            >
              <ButtonText fontWeight="$bold">Play Again</ButtonText>
            </Button>
          ) : (
            <Box h={54} alignItems="center" justifyContent="center">
              <Text color="$textLight400">
                Waiting for host to start a new game…
              </Text>
            </Box>
          )}

          <Button
            size="lg"
            borderRadius="$xl"
            variant="outline"
            borderColor={BRAND}
            onPress={() => router.replace('/')}
            sx={{ ':active': { bg: '$primary50' } }}
          >
            <ButtonText color={BRAND} fontWeight="$semibold">Home</ButtonText>
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
