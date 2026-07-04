import { Box, HStack, VStack, Text, Avatar, AvatarFallbackText } from '@gluestack-ui/themed';
import type { FinalScore } from '@country-city/shared';

interface Props {
  scores: FinalScore[];
}

const PLACES: { label: string; emoji: string; bg: string; accent: string; height: number }[] = [
  { label: '1st', emoji: '🥇', bg: '#FFF9E6', accent: '#D4A017', height: 160 },
  { label: '2nd', emoji: '🥈', bg: '#F8F9FA', accent: '#8E8E93', height: 120 },
  { label: '3rd', emoji: '🥉', bg: '#FFF5EE', accent: '#CD7F32', height: 90 },
];

export function Podium({ scores }: Props) {
  const top3 = scores.slice(0, 3);

  // Reorder for display: 2nd | 1st | 3rd
  const columns = [
    top3[1] ?? null, // 2nd (left)
    top3[0] ?? null, // 1st (center)
    top3[2] ?? null, // 3rd (right)
  ];

  if (top3.length === 0) {
    return (
      <Box alignItems="center" py="$8">
        <Text color="$textLight400">No scores yet</Text>
      </Box>
    );
  }

  return (
    <Box py="$6" px="$2">
      <HStack
        alignItems="flex-end"
        justifyContent="center"
        space="sm"
      >
        {columns.map((player, idx) => {
          const displayIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2; // map to PLACES
          const place = PLACES[displayIdx];

          if (!player) {
            return <Box key={`empty-${idx}`} flex={1} />;
          }

          return (
            <VStack key={player.userId} flex={1} alignItems="center" space="sm">
              {/* Emoji */}
              <Text style={{ fontSize: 32 }}>{place.emoji}</Text>

              {/* Avatar */}
              <Avatar size="lg" bgColor={player.avatarColor as any}>
                <AvatarFallbackText>{player.displayName}</AvatarFallbackText>
              </Avatar>

              {/* Name */}
              <Text
                size="sm"
                fontWeight="$bold"
                color="$textLight900"
                textAlign="center"
                numberOfLines={1}
              >
                {player.displayName}
              </Text>

              {/* Score */}
              <Text size="xl" fontWeight="$extrabold" color={place.accent}>
                {player.totalPoints}
              </Text>

              {/* Podium block */}
              <Box
                w="100%"
                h={place.height}
                bg={place.bg}
                borderTopLeftRadius="$xl"
                borderTopRightRadius="$xl"
                borderWidth={2}
                borderColor={place.accent}
                borderBottomWidth={0}
                alignItems="center"
                justifyContent="center"
              >
                <Text size="xs" fontWeight="$bold" color={place.accent} letterSpacing={1}>
                  {place.label}
                </Text>
              </Box>
            </VStack>
          );
        })}
      </HStack>
    </Box>
  );
}
