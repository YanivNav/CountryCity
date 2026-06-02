import { View, Text } from 'react-native';
import type { PlayerAnswer } from '@country-city/shared';

interface Props { answer: PlayerAnswer }

export function AnswerReveal({ answer }: Props) {
  return (
    <View>
      <Text>{answer.displayName}</Text>
      <Text>{answer.acceptedValue ?? '—'}</Text>
    </View>
  );
}
