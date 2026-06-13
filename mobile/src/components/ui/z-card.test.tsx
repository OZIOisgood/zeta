import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZCard } from './z-card';

test('renders children', async () => {
  await render(
    <ZCard>
      <Text>Card body</Text>
    </ZCard>,
  );
  expect(screen.getByText('Card body')).toBeOnTheScreen();
});
