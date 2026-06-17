import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ZListItem } from './z-list-item';

test('renders the title', async () => {
  await render(<ZListItem title="Notifications" />);
  expect(screen.getByText('Notifications')).toBeOnTheScreen();
});

test('renders the subtitle when provided', async () => {
  await render(<ZListItem title="Notifications" subtitle="Manage alerts" />);
  expect(screen.getByText('Manage alerts')).toBeOnTheScreen();
});

test('does not render a subtitle node when omitted', async () => {
  await render(<ZListItem title="Notifications" />);
  expect(screen.queryByText('Manage alerts')).not.toBeOnTheScreen();
});

test('renders leading and trailing nodes', async () => {
  await render(
    <ZListItem
      title="Account"
      leading={<View testID="leading-node" />}
      trailing={<Text>Trail</Text>}
    />,
  );
  expect(screen.getByTestId('leading-node')).toBeOnTheScreen();
  expect(screen.getByText('Trail')).toBeOnTheScreen();
});

test('fires onPress when pressed', async () => {
  const onPress = jest.fn();
  await render(<ZListItem title="Account" onPress={onPress} testID="row" />);
  fireEvent.press(screen.getByTestId('row'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('does not fire onPress when disabled', async () => {
  const onPress = jest.fn();
  await render(<ZListItem title="Account" onPress={onPress} disabled testID="row" />);
  fireEvent.press(screen.getByTestId('row'));
  expect(onPress).not.toHaveBeenCalled();
});

test('selected applies the secondary-container fill class (bare/Material)', async () => {
  await render(<ZListItem title="Account" selected testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.className).toContain('bg-secondary-container');
});

test('unselected does not apply the secondary-container fill class', async () => {
  await render(<ZListItem title="Account" testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.className).not.toContain('bg-secondary-container');
});

test('disabled sets accessibilityState.disabled', async () => {
  await render(<ZListItem title="Account" onPress={() => {}} disabled testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.accessibilityState?.disabled).toBe(true);
});

test('selected sets accessibilityState.selected', async () => {
  await render(<ZListItem title="Account" onPress={() => {}} selected testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.accessibilityState?.selected).toBe(true);
});

test('forwards className to the row container', async () => {
  await render(<ZListItem title="Account" className="mb-4" testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.className).toContain('mb-4');
});

test('forwards testID', async () => {
  await render(<ZListItem title="Account" testID="settings-row" />);
  expect(screen.getByTestId('settings-row')).toBeOnTheScreen();
});
