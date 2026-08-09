import { cleanup, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { ZStepper, type ZStep } from './z-stepper';

afterEach(cleanup);

const steps: ZStep[] = [
  { label: 'Upload', state: 'completed' },
  { label: 'Details', state: 'active' },
  { label: 'Review', state: 'upcoming' },
];

test('renders all step labels', async () => {
  await render(<ZStepper steps={steps} />);
  expect(screen.getByText('Upload')).toBeOnTheScreen();
  expect(screen.getByText('Details')).toBeOnTheScreen();
  expect(screen.getByText('Review')).toBeOnTheScreen();
});

test('tapping a completed step calls onStepPress with its index', async () => {
  const user = userEvent.setup();
  const onStepPress = jest.fn();
  await render(<ZStepper steps={steps} onStepPress={onStepPress} />);
  await user.press(screen.getByRole('button', { name: 'Upload' }));
  expect(onStepPress).toHaveBeenCalledWith(0);
});

test('tapping an upcoming step does not call onStepPress', async () => {
  const onStepPress = jest.fn();
  await render(<ZStepper steps={steps} onStepPress={onStepPress} />);
  fireEvent.press(screen.getByRole('button', { name: 'Review' }));
  expect(onStepPress).not.toHaveBeenCalled();
});

test('renders all five step labels without dropping any on narrow widths', async () => {
  const fiveSteps: ZStep[] = [
    { label: 'Upload', state: 'completed' },
    { label: 'Details', state: 'completed' },
    { label: 'Review', state: 'active' },
    { label: 'Publish', state: 'upcoming' },
    { label: 'Done', state: 'upcoming' },
  ];
  await render(<ZStepper steps={fiveSteps} />);
  for (const step of fiveSteps) {
    expect(screen.getByText(step.label)).toBeOnTheScreen();
  }
});

const REACHED_STEPS: ZStep[] = [
  { label: 'Expert', state: 'completed' },
  { label: 'Type', state: 'active' },
  { label: 'Time', state: 'upcoming' },
  { label: 'Confirm', state: 'upcoming' },
];

test('reached gates press: index <= reached is pressable, beyond is not', async () => {
  const user = userEvent.setup();
  const onStepPress = jest.fn();
  // reached = 2 → indices 0,1,2 pressable; index 3 locked
  await render(<ZStepper steps={REACHED_STEPS} reached={2} onStepPress={onStepPress} />);

  await user.press(screen.getByLabelText('Expert')); // index 0, reached
  expect(onStepPress).toHaveBeenCalledWith(0);

  onStepPress.mockClear();
  await user.press(screen.getByLabelText('Time')); // index 2, == reached
  expect(onStepPress).toHaveBeenCalledWith(2);

  onStepPress.mockClear();
  fireEvent.press(screen.getByLabelText('Confirm')); // index 3, > reached → locked
  expect(onStepPress).not.toHaveBeenCalled();
});

test('without reached, falls back to upcoming-disabled behavior', async () => {
  const user = userEvent.setup();
  const onStepPress = jest.fn();
  await render(<ZStepper steps={REACHED_STEPS} onStepPress={onStepPress} />);
  fireEvent.press(screen.getByLabelText('Time')); // upcoming → disabled
  expect(onStepPress).not.toHaveBeenCalled();
  await user.press(screen.getByLabelText('Expert')); // completed → enabled
  expect(onStepPress).toHaveBeenCalledWith(0);
});
