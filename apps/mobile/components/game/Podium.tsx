import { View, Text } from 'react-native';
import type { FinalScore } from '@country-city/shared';

interface Props { scores: FinalScore[] }

export function Podium({ scores }: Props) {
  const top3 = scores.slice(0, 3);
  return (
    <View>
      {top3.map((s, i) => (
        <Text key={s.userId}>{i + 1}. {s.displayName} — {s.totalPoints}pts</Text>
      ))}
    </View>
  );
}
