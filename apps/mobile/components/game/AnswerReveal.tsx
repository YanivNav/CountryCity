import { Box, HStack, VStack, Text, Avatar, AvatarFallbackText } from '@gluestack-ui/themed';
import type { PlayerAnswer } from '@country-city/shared';
import { ScoreBadge } from './ScoreBadge';

interface Props {
  answer: PlayerAnswer;
}

export function AnswerReveal({ answer }: Props) {
  const hasAnswer = answer.acceptedValue != null;

  return (
    <Box
      bg="$white"
      borderRadius="$xl"
      p="$3"
      borderWidth={1}
      borderColor={hasAnswer ? '$borderLight200' : '$borderLight100'}
      opacity={hasAnswer ? 1 : 0.55}
    >
      <HStack alignItems="center" space="md">
        {/* Avatar */}
        <Avatar size="md" bgColor={answer.avatarColor as any}>
          <AvatarFallbackText>{answer.displayName}</AvatarFallbackText>
        </Avatar>

        {/* Name + answer */}
        <VStack flex={1} space="xs">
          <Text size="sm" fontWeight="$semibold" color="$textLight900">
            {answer.displayName}
          </Text>
          <Text size="md" fontWeight="$medium" color={hasAnswer ? '$textLight900' : '$textLight400'}>
            {answer.acceptedValue ?? '—'}
          </Text>
          {/* Safety answers: show smaller below the accepted one */}
          {answer.values.length > 1 && (
            <Text size="xs" color="$textLight400" numberOfLines={2}>
              Also: {answer.values.filter((v) => v !== answer.acceptedValue).join(', ')}
            </Text>
          )}
        </VStack>

        {/* Score */}
        <ScoreBadge score={answer.score} />
      </HStack>
    </Box>
  );
}
