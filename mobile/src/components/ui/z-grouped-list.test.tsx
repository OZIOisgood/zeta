import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZGroupedList } from './z-grouped-list';

const DATA = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

function renderRow(item: { id: string; label: string }) {
  return <Text testID={`row-${item.id}`}>{item.label}</Text>;
}

test('embed mode renders every row', async () => {
  await render(
    <ZGroupedList
      data={DATA}
      keyExtractor={(i) => i.id}
      renderItem={renderRow}
      testID="grouped"
    />,
  );
  expect(screen.getByTestId('row-a')).toBeOnTheScreen();
  expect(screen.getByTestId('row-b')).toBeOnTheScreen();
  expect(screen.getByTestId('row-c')).toBeOnTheScreen();
});

test('scroll mode renders every row through a FlatList', async () => {
  await render(
    <ZGroupedList
      scroll
      data={DATA}
      keyExtractor={(i) => i.id}
      renderItem={renderRow}
      testID="grouped"
    />,
  );
  expect(screen.getByTestId('grouped')).toBeOnTheScreen();
  expect(screen.getByTestId('row-a')).toBeOnTheScreen();
  expect(screen.getByTestId('row-c')).toBeOnTheScreen();
});

test('scroll mode shows ListEmptyComponent when data is empty', async () => {
  await render(
    <ZGroupedList
      scroll
      data={[]}
      keyExtractor={(i: { id: string }) => i.id}
      renderItem={() => null}
      ListEmptyComponent={<Text testID="empty">none</Text>}
    />,
  );
  expect(screen.getByTestId('empty')).toBeOnTheScreen();
});
