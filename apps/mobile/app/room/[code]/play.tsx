import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
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
  Input,
  InputField,
  Pressable,
} from '@gluestack-ui/themed';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../../stores/gameStore';
import { socketEmit } from '../../../lib/socket';
import { categoryLabel } from '../../../lib/categories';
import { MAX_WIDE_WIDTH, SCREEN_H_PAD } from '../../../lib/layout';

const BRAND = '$primary500';
const SUCCESS = '$success500';
const CORAL = '#FF6B5B';

type AnswerPayload = { category: string; values: string[] };

function buildPayload(myAnswers: Record<string, string[]>): AnswerPayload[] {
  return Object.entries(myAnswers)
    .map(([category, values]) => ({
      category,
      values: values.map((v) => v.trim()).filter((v) => v.length > 0),
    }))
    .filter((entry) => entry.values.length > 0);
}

export default function PlayScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const phase = useGameStore((s) => s.phase);
  const countdownSeconds = useGameStore((s) => s.countdown);
  const myAnswers = useGameStore((s) => s.myAnswers);
  const setMyAnswer = useGameStore((s) => s.setMyAnswer);
  const addAnswerSlot = useGameStore((s) => s.addAnswerSlot);

  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const letter = round?.letter ?? '';
  const language = room?.settings.language ?? 'en';
  const allowMultiple = room?.settings.allowMultipleAnswers ?? false;
  const categories = useMemo(
    () => room?.settings.categories ?? [],
    [room?.settings.categories],
  );

  const filledCount = categories.filter((id) =>
    (myAnswers[id] ?? []).some((v) => v.trim().length > 0),
  ).length;

  const locked = done || secondsLeft === 0;

  // ── Local countdown tick (visual only; server drives the actual round end) ──
  useEffect(() => {
    if (countdownSeconds == null) return;
    setSecondsLeft(countdownSeconds);
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdownSeconds]);

  // ── Debounced auto-submit so the server always has the latest answers ──
  useEffect(() => {
    if (phase !== 'playing' || locked) return;
    const t = setTimeout(() => {
      socketEmit.submitAnswers(buildPayload(myAnswers));
    }, 600);
    return () => clearTimeout(t);
  }, [myAnswers, phase, locked]);

  // ── Round ended on the server → move to review ──
  useEffect(() => {
    if (phase === 'reviewing') {
      router.replace(`/room/${code}/review`);
    }
  }, [phase, code]);

  function handleDone() {
    if (locked) return;
    socketEmit.submitAnswers(buildPayload(myAnswers)); // flush latest before marking done
    socketEmit.markDone();
    setDone(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  }

  const countdownActive = secondsLeft != null;
  const pct =
    countdownActive && countdownSeconds
      ? Math.max(0, (secondsLeft! / countdownSeconds) * 100)
      : 100;
  const barColor =
    secondsLeft != null && secondsLeft <= 15 ? CORAL : '#3D2FCF';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Box flex={1} bg="$backgroundLight50">
        {/* ── Header: letter + progress ── */}
        <Box bg="$white" borderBottomWidth={1} borderBottomColor="$borderLight200">
          <HStack
            style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
            px={SCREEN_H_PAD}
            pt={56}
            pb={16}
            alignItems="center"
            space="md"
          >
            <Box
              w={52}
              h={52}
              borderRadius="$xl"
              bg={BRAND}
              alignItems="center"
              justifyContent="center"
            >
              <Text style={{ fontSize: 30, fontWeight: '900' }} color="$white">
                {letter}
              </Text>
            </Box>

            <VStack flex={1}>
              <Heading size="sm" color="$textLight900">
                Fill the categories
              </Heading>
              <Text size="sm" color="$textLight400">
                {filledCount} / {categories.length} filled
              </Text>
            </VStack>

            {countdownActive && (
              <Box
                px="$3"
                py="$1"
                borderRadius="$lg"
                bg={secondsLeft! <= 15 ? CORAL : '$primary50'}
              >
                <Text
                  fontWeight="$bold"
                  color={secondsLeft! <= 15 ? '$white' : BRAND}
                >
                  0:{String(secondsLeft).padStart(2, '0')}
                </Text>
              </Box>
            )}
          </HStack>

          {/* Countdown bar */}
          {countdownActive && (
            <Box h={5} bg="$borderLight100">
              <Box h={5} bg={barColor} style={{ width: `${pct}%` }} />
            </Box>
          )}
        </Box>

        {/* ── Categories ── */}
        <ScrollView flex={1} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <VStack
            style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
            px={SCREEN_H_PAD}
            py="$5"
            space="lg"
          >
            {categories.map((id) => {
              const values = myAnswers[id] ?? [''];
              const hasValue = values.some((v) => v.trim().length > 0);
              return (
                <VStack key={id} space="xs">
                  <HStack alignItems="center" space="sm">
                    <Heading size="xs" color="$textLight900">
                      {categoryLabel(id, language)}
                    </Heading>
                    {hasValue && (
                      <Text color={SUCCESS} fontWeight="$bold">
                        ✓
                      </Text>
                    )}
                  </HStack>

                  {values.map((value, idx) => (
                    <Input
                      key={idx}
                      variant="outline"
                      borderRadius="$lg"
                      bg="$white"
                      isDisabled={locked}
                      borderColor={hasValue ? SUCCESS : '$borderLight300'}
                    >
                      <InputField
                        value={value}
                        onChangeText={(t) => setMyAnswer(id, idx, t)}
                        placeholder={letter ? `${letter}…` : ''}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </Input>
                  ))}

                  {allowMultiple && !locked && (
                    <Pressable onPress={() => addAnswerSlot(id)} py="$1">
                      <Text size="sm" color={BRAND} fontWeight="$semibold">
                        + Add another answer
                      </Text>
                    </Pressable>
                  )}
                </VStack>
              );
            })}
          </VStack>
        </ScrollView>

        {/* ── Footer: I'm Done ── */}
        <Box bg="$white" borderTopWidth={1} borderTopColor="$borderLight200">
          <VStack
            style={{ maxWidth: MAX_WIDE_WIDTH, width: '100%', alignSelf: 'center' }}
            px={SCREEN_H_PAD}
            pt="$4"
            pb="$9"
          >
            {done ? (
              <Box h={54} alignItems="center" justifyContent="center">
                <Text color="$textLight500" fontWeight="$semibold">
                  Done! Waiting for the round to end…
                </Text>
              </Box>
            ) : (
              <Button
                size="lg"
                borderRadius="$xl"
                bg={BRAND}
                isDisabled={locked}
                onPress={handleDone}
                sx={{ ':active': { bg: '$primary600' }, ':disabled': { opacity: 0.45 } }}
              >
                <ButtonText fontWeight="$bold">I'm Done</ButtonText>
              </Button>
            )}
          </VStack>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}
