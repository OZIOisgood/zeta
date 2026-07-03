import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { StatCard } from './stat-card';

test('renders the label and count', async () => {
  await render(
    <StatCard label="Videos" count={7} icon={<Text>icon</Text>} onPress={jest.fn()} />,
  );
  expect(screen.getByText('Videos')).toBeOnTheScreen();
  expect(screen.getByText('7')).toBeOnTheScreen();
});

test('exposes label and count to assistive tech', async () => {
  await render(
    <StatCard label="Groups" count={3} icon={<Text>icon</Text>} onPress={jest.fn()} />,
  );
  expect(screen.getByRole('button', { name: 'Groups: 3' })).toBeOnTheScreen();
});

test('fires onPress when pressed', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(
    <StatCard label="Sessions" count={0} icon={<Text>icon</Text>} onPress={onPress} />,
  );
  await user.press(screen.getByRole('button', { name: 'Sessions: 0' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
