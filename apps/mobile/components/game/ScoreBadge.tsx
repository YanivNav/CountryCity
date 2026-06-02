import { Text } from 'react-native';

interface Props { score: number | null }

export function ScoreBadge({ score }: Props) {
  if (score === null) return <Text>—</Text>;
  return <Text>+{score}</Text>;
}
