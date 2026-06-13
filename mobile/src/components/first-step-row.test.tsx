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

test('reports an unchecked state when incomplete', async () => {
  await render(
    <FirstStepRow label="Step" description="desc" completed={false} onPress={jest.fn()} />,
  );
  const row = screen.getByRole('button', { name: 'Step' });
  expect(row.props.accessibilityState).toMatchObject({ checked: false });
});

test('reports a checked state when completed', async () => {
  await render(
    <FirstStepRow label="Step" description="desc" completed onPress={jest.fn()} />,
  );
  const row = screen.getByRole('button', { name: 'Step' });
  expect(row.props.accessibilityState).toMatchObject({ checked: true });
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
