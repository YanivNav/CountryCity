import { Box, Text } from '@gluestack-ui/themed';

interface Props {
  score: number | null;
  /** Show the "+" prefix, e.g. "+15". Default true. */
  showPlus?: boolean;
}

const SCORE_COLORS: Record<string, { bg: string; fg: string }> = {
  uniqueWinner: { bg: '#FFF7E6', fg: '#D4A017' }, // gold
  unique:       { bg: '#E6F9F1', fg: '#1A8D5E' }, // green
  shared:       { bg: '#EBF0FF', fg: '#3D2FCF' }, // indigo
  none:         { bg: '#F3F4F6', fg: '#9CA3AF' }, // gray
};

function colorFor(score: number): { bg: string; fg: string } {
  if (score >= 15) return SCORE_COLORS.uniqueWinner;
  if (score >= 10) return SCORE_COLORS.unique;
  if (score >= 5)  return SCORE_COLORS.shared;
  return SCORE_COLORS.none;
}

export function ScoreBadge({ score, showPlus = true }: Props) {
  if (score === null || score === 0) {
    return (
      <Box
        px="$2"
        py="$1"
        borderRadius="$md"
        bg={SCORE_COLORS.none.bg}
        minWidth={40}
        alignItems="center"
      >
        <Text size="sm" fontWeight="$bold" color={SCORE_COLORS.none.fg}>
          —
        </Text>
      </Box>
    );
  }

  const c = colorFor(score);

  return (
    <Box
      px="$2"
      py="$1"
      borderRadius="$md"
      bg={c.bg}
      minWidth={40}
      alignItems="center"
    >
      <Text size="sm" fontWeight="$bold" color={c.fg}>
        {showPlus ? '+' : ''}{score}
      </Text>
    </Box>
  );
}
