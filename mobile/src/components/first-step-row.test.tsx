import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { FirstStepRow } from './first-step-row';

test('renders the label and description', async () => {
  await render(
    <FirstStepRow
      label="Upload your first video"
      description="Share a training video so an expert can review it."
      completed={false}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByText('Upload your first video')).toBeOnTheScreen();
  expect(
    screen.getByText('Share a training video so an expert can review it.'),
  ).toBeOnTheScreen();
});

test('renders by testID', async () => {
  await render(
    <FirstStepRow
      testID="first-step-row"
      label="Step"
      description="desc"
      completed={false}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByTestId('first-step-row')).toBeOnTheScreen();
});

test('shows the empty outline ring and a chevron when incomplete', async () => {
  await render(
    <FirstStepRow label="Step" description="desc" completed={false} onPress={jest.fn()} />,
  );
  expect(screen.getByTestId('first-step-row-circle')).toBeOnTheScreen();
  expect(screen.getByTestId('first-step-row-chevron')).toBeOnTheScreen();
  expect(screen.queryByTestId('first-step-row-check')).toBeNull();
  expect(screen.queryByTestId('first-step-row-check-glyph')).toBeNull();
});

test('shows the filled check circle (with an inner check glyph) and no chevron when completed', async () => {
  await render(
    <FirstStepRow label="Step" description="desc" completed onPress={jest.fn()} />,
  );
  expect(screen.getByTestId('first-step-row-check')).toBeOnTheScreen();
  expect(screen.getByTestId('first-step-row-check-glyph')).toBeOnTheScreen();
  expect(screen.queryByTestId('first-step-row-circle')).toBeNull();
  expect(screen.queryByTestId('first-step-row-chevron')).toBeNull();
});

test('reports a selected state when completed', async () => {
  await render(
    <FirstStepRow label="Step" description="desc" completed onPress={jest.fn()} />,
  );
  const row = screen.getByRole('button', { name: 'Step' });
  expect(row.props.accessibilityState).toMatchObject({ selected: true });
});

test('fires onPress when pressed', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(
    <FirstStepRow label="Step" description="desc" completed={false} onPress={onPress} />,
  );
  await user.press(screen.getByRole('button', { name: 'Step' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
