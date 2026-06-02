import { View } from 'react-native';

interface Props { seconds: number; total: number }

export function CountdownBar({ seconds, total }: Props) {
  const ratio = seconds / total;
  return (
    <View style={{ height: 6, backgroundColor: '#eee' }}>
      <View style={{ height: '100%', width: `${ratio * 100}%`, backgroundColor: '#3D2FCF' }} />
    </View>
  );
}
