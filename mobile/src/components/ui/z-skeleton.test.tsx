import { render, screen } from '@testing-library/react-native';
import { ZSkeleton } from './z-skeleton';

test('renders an accessible placeholder', async () => {
  await render(<ZSkeleton testID="sk" className="h-4 w-24" />);
  expect(screen.getByTestId('sk')).toBeOnTheScreen();
});
