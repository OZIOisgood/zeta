import { render, screen } from '@testing-library/react-native';
import { ZProgress } from './z-progress';

test('renders a progressbar with a clamped percentage width', async () => {
  await render(<ZProgress value={0.5} testID="p" />);
  const bar = screen.getByTestId('p');
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
});

test('clamps out-of-range values to 0..100', async () => {
  await render(<ZProgress value={1.7} testID="over" />);
  expect(screen.getByTestId('over').props.accessibilityValue.now).toBe(100);
});
