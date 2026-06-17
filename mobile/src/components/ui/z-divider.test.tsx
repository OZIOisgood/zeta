import { render, screen } from '@testing-library/react-native';
import { ZDivider } from './z-divider';

test('horizontal default renders a thin full-width outline rule', async () => {
  await render(<ZDivider testID="divider" />);
  const cls = screen.getByTestId('divider').props.className as string;
  expect(cls).toContain('h-px');
  expect(cls).toContain('w-full');
  expect(cls).toContain('bg-outline');
});

test('vertical renders a thin full-height outline rule', async () => {
  await render(<ZDivider vertical testID="divider" />);
  const cls = screen.getByTestId('divider').props.className as string;
  expect(cls).toContain('w-px');
  expect(cls).toContain('h-full');
  expect(cls).toContain('bg-outline');
});

test('horizontal inset adds a 16dp horizontal margin (mx-4)', async () => {
  await render(<ZDivider inset testID="divider" />);
  expect(screen.getByTestId('divider').props.className).toContain('mx-4');
});

test('vertical inset adds a 16dp vertical margin (my-4)', async () => {
  await render(<ZDivider vertical inset testID="divider" />);
  expect(screen.getByTestId('divider').props.className).toContain('my-4');
});

test('forwards consumer className onto the wrapper', async () => {
  await render(<ZDivider className="my-8" testID="divider" />);
  expect(screen.getByTestId('divider').props.className).toContain('my-8');
});

test('forwards testID', async () => {
  await render(<ZDivider testID="custom-divider" />);
  expect(screen.getByTestId('custom-divider')).toBeOnTheScreen();
});
