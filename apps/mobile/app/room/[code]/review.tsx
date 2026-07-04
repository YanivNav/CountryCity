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
} from '@gluestack-ui/themed';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { socketEmit } from '../../../lib/socket';
import { categoryLabel } from '../../../lib/categories';
import { AnswerReveal } from '../../../components/game/AnswerReveal';
import { MAX_WIDE_WIDTH, SCREEN_H_PAD } from '../../../lib/layout';

const BRAND = '$primary500';
const AUTO_ADVANCE_SEC = 6;

export default function ReviewScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const phase = useGameStore((s) => s.phase);
  const review = useGameStore((s) => s.currentCategoryReview);
  const reviewIndex = useGameStore((s) => s.reviewIndex); // 1-based
  const myId = useUserStore((s) => s.id);

  const categories = room?.settings.categories ?? [];
  const language = room?.settings.language ?? 'en';
  const isHost = room?.hostId === myId;

  // ── Running score tally (accumulate across categories) ──
  const [runningScores, setRunningScores] = useState<Record<string, number>>({});
  const seenCategories = useRef(new Set<string>());

  useEffect(() => {
    if (!review) return;
    // Only accumulate each category once
    if (seenCategories.current.has(review.categoryId)) return;
    seenCategories.current.add(review.categoryId);

    setRunningScores((prev) => {
      const next = { ...prev };
      for (const answer of review.answers) {
        next[answer.userId] = (next[answer.userId] ?? 0) + (answer.score ?? 0);
      }
      return next;
    });
  }, [review]);

  // Reset accumulator when the round changes
  const roundId = round?.id;
  useEffect(() => {
    seenCategories.current.clear();
    setRunningScores({});
  }, [roundId]);

  // ── Auto-advance timer (host only) ──
  const [autoSec, setAutoSec] = useState(AUTO_ADVANCE_SEC);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!review || !isHost) return;
    setAutoSec(AUTO_ADVANCE_SEC);
    autoTimer.current = setInterval(() => {
      setAutoSec((prev) => {
        if (prev <= 1) {
          // time's up — advance
          socketEmit.advanceReview();
          return AUTO_ADVANCE_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [review, isHost]);

  // ── Navigate to results when game finishes ──
  useEffect(() => {
    if (phase === 'finished') {
      router.replace(`/room/${code}/results`);
    }
  }, [phase, code]);

  // ── Derived ──
  const currentCatIdx = reviewIndex - 1; // 0-based
  const totalCats = categories.length;
  const isLastCategory = currentCatIdx >= totalCats - 1;
  const players = room?.players ?? [];

  // Sort players by running score (descending) for the tally
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => (runningScores[b.id] ?? 0) - (runningScores[a.id] ?? 0),
      ),
    [players, runningScores],
  );

  // ── Loading state (category not yet received) ──
  if (!review) {
    return (
      <Box flex={1} bg="$backgroundLight50" alignItems="center" justifyContent="center">
        <Heading size="sm" color="$textLight400">
          Loading review…
        </Heading>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight50">
      {/* ── Header bar ────────────────────────────────────────── */}
      <Box bg="$white" borderBottomWidth={1} borderBottomColor="$borderLight200">
        <HStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pt={56}
          pb={12}
          alignItems="center"
          justifyContent="space-between"
        >
          <Box w={40} />
          <Heading size="md" color="$textLight900">
            Review
          </Heading>
          <Text size="sm" fontWeight="$semibold" color="$textLight400">
            {currentCatIdx + 1}/{totalCats}
          </Text>
        </HStack>

        {/* ── Category progress pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_H_PAD,
            paddingBottom: 14,
            gap: 8,
            maxWidth: MAX_WIDE_WIDTH,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          {categories.map((catId, idx) => {
            const isCurrent = idx === currentCatIdx;
            const isPast = idx < currentCatIdx;
            return (
              <Box
                key={catId}
                px="$3"
                py="$1"
                borderRadius="$full"
                bg={isCurrent ? '$primary500' : isPast ? '$primary50' : '$borderLight100'}
              >
                <Text
                  size="xs"
                  fontWeight="$semibold"
                  color={isCurrent ? '$white' : isPast ? '$primary500' : '$textLight400'}
                  numberOfLines={1}
                >
                  {categoryLabel(catId, language)}
                </Text>
              </Box>
            );
          })}
        </ScrollView>
      </Box>

      {/* ── Category title ────────────────────────────────────── */}
      <Box alignItems="center" pt="$6" pb="$4">
        <Text size="sm" fontWeight="$semibold" color="$textLight400" letterSpacing={1.5} textTransform="uppercase">
          Category
        </Text>
        <Heading size="2xl" color="$textLight900" mt="$1">
          {review.categoryLabel}
        </Heading>
        {round && (
          <Text size="sm" color="$textLight400" mt="$1">
            Letter: <Text fontWeight="$bold" color="$primary500">{round.letter}</Text>
          </Text>
        )}
      </Box>

      {/* ── Answer cards ──────────────────────────────────────── */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <VStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pb="$4"
          space="sm"
        >
          {review.answers.map((answer) => (
            <AnswerReveal key={answer.userId} answer={answer} />
          ))}
        </VStack>
      </ScrollView>

      {/* ── Footer: running scores + Next button ───────────────── */}
      <Box bg="$white" borderTopWidth={1} borderTopColor="$borderLight200">
        <VStack
          style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
          px={SCREEN_H_PAD}
          pt="$3"
          pb="$9"
          space="sm"
        >
          {/* Running score tally */}
          <HStack justifyContent="center" space="lg" flexWrap="wrap">
            {sortedPlayers.map((p) => {
              const score = runningScores[p.id] ?? 0;
              return (
                <HStack key={p.id} space="xs" alignItems="baseline">
                  <Text size="xs" color="$textLight500" numberOfLines={1} style={{ maxWidth: 80 }}>
                    {p.displayName}
                  </Text>
                  <Text
                    size="sm"
                    fontWeight="$bold"
                    color={score > 0 ? '$primary500' : '$textLight400'}
                  >
                    {score}
                  </Text>
                </HStack>
              );
            })}
          </HStack>

          {/* Action */}
          {isHost ? (
            <Button
              size="lg"
              borderRadius="$xl"
              bg={BRAND}
              onPress={() => socketEmit.advanceReview()}
              sx={{ ':active': { bg: '$primary600' } }}
            >
              <ButtonText fontWeight="$bold">
                {isLastCategory ? 'See Results' : 'Next'} ({autoSec}s)
              </ButtonText>
            </Button>
          ) : (
            <Box h={54} alignItems="center" justifyContent="center">
              <Text color="$textLight400">
                Waiting for host to advance…
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
