/**
 * Thin wrapper around Gluestack's Switch — adds a label to the left.
 */
import { Switch, HStack, Text } from '@gluestack-ui/themed';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isDisabled?: boolean;
}

export function Toggle({ label, value, onChange, isDisabled }: Props) {
  return (
    <HStack justifyContent="space-between" alignItems="center" py="$2">
      <Text fontWeight="$medium" color="$textLight900">{label}</Text>
      <Switch
        value={value}
        onToggle={onChange}
        isDisabled={isDisabled}
        trackColor={{ true: '#3D2FCF' } as any}
        sx={{ ':checked': { props: { trackColor: { true: '#3D2FCF' } } } }}
      />
    </HStack>
  );
}
