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

test('subtitle defaults to 3 lines', async () => {
  await render(<ZListItem title="Notifications" subtitle="Manage alerts" />);
  expect(screen.getByText('Manage alerts').props.numberOfLines).toBe(3);
});

test('subtitle respects a passed subtitleNumberOfLines', async () => {
  await render(
    <ZListItem title="Notifications" subtitle="Manage alerts" subtitleNumberOfLines={1} />,
  );
  expect(screen.getByText('Manage alerts').props.numberOfLines).toBe(1);
});

test('title defaults to 1 line', async () => {
  await render(<ZListItem title="Notifications" />);
  expect(screen.getByText('Notifications').props.numberOfLines).toBe(1);
});

test('title respects a passed titleNumberOfLines', async () => {
  await render(<ZListItem title="Long message" titleNumberOfLines={2} />);
  expect(screen.getByText('Long message').props.numberOfLines).toBe(2);
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

test('exposes the button role when onPress is provided', async () => {
  await render(<ZListItem title="Account" onPress={() => {}} />);
  expect(screen.getByRole('button')).toBeOnTheScreen();
});

test('a row WITHOUT onPress does not expose the button role', async () => {
  await render(<ZListItem title="Account" testID="row" />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('a row WITHOUT onPress does not fire anything on press', async () => {
  // A non-interactive container holds its own controls; pressing the row body
  // itself must be a no-op (it is a plain View, not a Pressable).
  await render(<ZListItem title="Account" testID="row" />);
  const row = screen.getByTestId('row');
  // The plain View has no onPress handler — pressing it does nothing and throws
  // nothing.
  expect(() => fireEvent.press(row)).not.toThrow();
  expect(row.props.onPress).toBeUndefined();
});

test('a non-interactive row still reflects selected/disabled accessibility state', async () => {
  await render(<ZListItem title="Account" selected disabled testID="row" />);
  const row = screen.getByTestId('row');
  expect(row.props.accessibilityState?.selected).toBe(true);
  expect(row.props.accessibilityState?.disabled).toBe(true);
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

test('renders the titleAccessory node on the title line', async () => {
  await render(
    <ZListItem title="Discovery call" titleAccessory={<Text>30 min</Text>} testID="row" />,
  );
  expect(screen.getByText('30 min')).toBeOnTheScreen();
});

test('trailing can hold and render multiple nodes', async () => {
  await render(
    <ZListItem
      title="Account"
      trailing={
        <>
          <View testID="trail-edit" />
          <View testID="trail-delete" />
        </>
      }
    />,
  );
  expect(screen.getByTestId('trail-edit')).toBeOnTheScreen();
  expect(screen.getByTestId('trail-delete')).toBeOnTheScreen();
});
