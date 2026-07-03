import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ZCard } from './z-card';

test('renders children', async () => {
  await render(
    <ZCard>
      <Text>Card body</Text>
    </ZCard>,
  );
  expect(screen.getByText('Card body')).toBeOnTheScreen();
});

test('default is a tonal surface card: rounded-[20px] bg-surface, no border', async () => {
  await render(
    <ZCard testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('rounded-[20px]');
  expect(cls).toContain('bg-surface');
  expect(cls).not.toContain('border');
});

test('tone="accent" fills with bg-accent-container', async () => {
  await render(
    <ZCard tone="accent" testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('bg-accent-container');
  expect(cls).not.toContain('bg-surface');
});

test('tone="secondary" fills with bg-secondary-container', async () => {
  await render(
    <ZCard tone="secondary" testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('bg-secondary-container');
  expect(cls).not.toContain('bg-surface');
});

test('hero uses the larger rounded-[28px] radius', async () => {
  await render(
    <ZCard hero testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('rounded-[28px]');
  expect(cls).not.toContain('rounded-[20px]');
});

test('variant="outlined" adds a warm hairline border on a white fill', async () => {
  await render(
    <ZCard variant="outlined" testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('border');
  expect(cls).toContain('border-outline');
  expect(cls).toContain('bg-white');
});

test('variant="elevated" adds a soft shadow', async () => {
  await render(
    <ZCard variant="elevated" testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('shadow-sm');
});

test('consumer className is appended after the base classes (layout wins)', async () => {
  await render(
    <ZCard className="mx-4 gap-3" testID="card">
      <Text>Body</Text>
    </ZCard>,
  );
  const cls = screen.getByTestId('card').props.className as string;
  expect(cls).toContain('mx-4');
  expect(cls).toContain('gap-3');
  // base classes remain present
  expect(cls).toContain('rounded-[20px]');
  expect(cls).toContain('bg-surface');
});
