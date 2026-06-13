import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { ZStepper, type ZStep } from './z-stepper';

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
