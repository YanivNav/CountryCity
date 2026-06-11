import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Box, Text } from '@gluestack-ui/themed';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../../stores/gameStore';

const POOL_EN = 'ABCDEFGHIJKLMNOPRSTW'.split('');
const POOL_HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

const SPIN_MS = 1500; // how long letters cycle before snapping
const HOLD_MS = 1200; // how long the chosen letter stays before navigating

function poolFor(letter: string): string[] {
  return /[A-Z]/i.test(letter) ? POOL_EN : POOL_HE;
}

export default function RollingScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const round = useGameStore((s) => s.round);
  const setPhase = useGameStore((s) => s.setPhase);
  const finalLetter = round?.letter ?? '';

  const [display, setDisplay] = useState(finalLetter);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!finalLetter) return;

    const pool = poolFor(finalLetter);
    let frame = 0;

    // Cycle random letters to fake a slot-machine spin (basic — Reanimated in Phase 2).
    const spin = setInterval(() => {
      frame += 1;
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
    }, 70);

    const snap = setTimeout(() => {
      clearInterval(spin);
      setDisplay(finalLetter);
      setSettled(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    }, SPIN_MS);

    const go = setTimeout(() => {
      setPhase('playing'); // server already moved to PLAYING; mirror it client-side
      router.replace(`/room/${code}/play`);
    }, SPIN_MS + HOLD_MS);

    return () => {
      clearInterval(spin);
      clearTimeout(snap);
      clearTimeout(go);
    };
  }, [finalLetter, code]);

  return (
    <Box flex={1} bg="#16141E" alignItems="center" justifyContent="center">
      <Text size="sm" color="$textLight400" letterSpacing={2} textTransform="uppercase">
        Your letter is
      </Text>

      <Box
        mt="$8"
        w={180}
        h={180}
        borderRadius="$3xl"
        alignItems="center"
        justifyContent="center"
        bg={settled ? '#3D2FCF' : '#1F1D2B'}
        sx={{
          shadowColor: '#3D2FCF',
          shadowOpacity: settled ? 0.6 : 0.15,
          shadowRadius: 28,
          elevation: 10,
        }}
      >
        <Text style={{ fontSize: 110, fontWeight: '900' }} color="$white">
          {display}
        </Text>
      </Box>

      <Text mt="$10" size="md" color="$textLight500">
        {settled ? 'Get ready…' : 'Rolling…'}
      </Text>
    </Box>
  );
}
