import { View, Text } from 'react-native';

interface Props { letter: string }

export function LetterRoller({ letter }: Props) {
  return <View><Text>{letter}</Text></View>;
}
