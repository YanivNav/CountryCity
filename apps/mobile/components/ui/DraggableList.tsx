import { FlatList } from 'react-native';

interface Props<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (from: number, to: number) => void;
  keyExtractor: (item: T) => string;
}

export function DraggableList<T>({ data, renderItem, keyExtractor }: Props<T>) {
  // TODO: implement drag-to-reorder with react-native-gesture-handler
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => renderItem(item, index) as any}
    />
  );
}
