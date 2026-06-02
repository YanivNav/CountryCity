import { View, Text } from 'react-native';
import type { Player } from '@country-city/shared';

interface Props { player: Player }

export function PlayerCard({ player }: Props) {
  return (
    <View>
      <Text>{player.displayName}</Text>
      {player.isHost && <Text>Host</Text>}
    </View>
  );
}
