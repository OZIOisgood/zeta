import { render, screen } from '@testing-library/react-native';
import { ZBadge } from './z-badge';

test('renders the label', async () => {
  await render(<ZBadge label="Pending" />);
  expect(screen.getByText('Pending')).toBeOnTheScreen();
});

test('applies the testID', async () => {
  await render(<ZBadge label="Pending" testID="status-badge" />);
  expect(screen.getByTestId('status-badge')).toBeOnTheScreen();
});

test('renders the label for the success tone', async () => {
  await render(<ZBadge label="Live" tone="success" />);
  expect(screen.getByText('Live')).toBeOnTheScreen();
});

test('renders the label for the danger tone', async () => {
  await render(<ZBadge label="Failed" tone="danger" />);
  expect(screen.getByText('Failed')).toBeOnTheScreen();
});
