import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZBookingBar } from './z-booking-bar';

test('shows headline + context when headline present', async () => {
  await render(
    <ZBookingBar headline="30 min" context="Video review · Alice" ctaLabel="Next" onPress={() => {}} testID="bar" />,
  );
  expect(screen.getByText('30 min')).toBeTruthy();
  expect(screen.getByText('Video review · Alice')).toBeTruthy();
});

test('shows hint when headline absent', async () => {
  await render(<ZBookingBar hint="Choose a type" ctaLabel="Next" onPress={() => {}} testID="bar" />);
  expect(screen.getByText('Choose a type')).toBeTruthy();
});

test('fires onPress when CTA tapped and enabled', async () => {
  const onPress = jest.fn();
  await render(<ZBookingBar headline="30 min" ctaLabel="Book" onPress={onPress} testID="bar" />);
  fireEvent.press(screen.getByText('Book'));
  expect(onPress).toHaveBeenCalled();
});

test('does not fire onPress when disabled', async () => {
  const onPress = jest.fn();
  await render(<ZBookingBar headline="30 min" ctaLabel="Book" ctaDisabled onPress={onPress} testID="bar" />);
  fireEvent.press(screen.getByText('Book'));
  expect(onPress).not.toHaveBeenCalled();
});
