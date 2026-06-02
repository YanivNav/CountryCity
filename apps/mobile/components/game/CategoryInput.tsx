import { View, Text, TextInput } from 'react-native';

interface Props {
  label: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAddSlot?: () => void;
  locked?: boolean;
}

export function CategoryInput({ label, values, onChange, locked }: Props) {
  return (
    <View>
      <Text>{label}</Text>
      {values.map((v, i) => (
        <TextInput key={i} value={v} onChangeText={(t) => onChange(i, t)} editable={!locked} />
      ))}
    </View>
  );
}
