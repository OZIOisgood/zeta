import { render, screen, userEvent } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Text } from 'react-native';
import { ZFab } from './z-fab';

test('renders an extended fab with label and fires onPress', async () => {
  const onPress = jest.fn();
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={onPress} testID="fab" />);
  expect(screen.getByText('Upload')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByTestId('fab'));
  expect(onPress).toHaveBeenCalled();
});

test('hides the label when not extended (icon-only FAB)', async () => {
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} extended={false} testID="fab" />);
  expect(screen.queryByText('Upload')).toBeNull();
});

test('icon-only FAB is a compact ~56dp square (not a full-width / pill stretch)', async () => {
  // The collapsed create FAB must hug its content: a fixed 56dp square with the
  // centered "+" glyph — never a horizontally padded pill or a full-width bar.
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} extended={false} testID="fab" />);
  const surface = screen.getByTestId('fab');
  expect(surface.props.className).toContain('h-14');
  expect(surface.props.className).toContain('w-14');
  expect(surface.props.className).toContain('justify-center');
  // No horizontal padding on the icon-only variant — that padding is what makes
  // an extended FAB wide; the square must not carry it.
  expect(surface.props.className).not.toContain('px-5');
  // It must still hug content (self-start), never stretch to fill its parent.
  expect(surface.props.className).toContain('self-start');
});

test('primary tone (default) fills with accent + on-accent content', async () => {
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} testID="fab" />);
  const surface = screen.getByTestId('fab');
  expect(surface.props.className).toContain('bg-accent');
  expect(surface.props.className).not.toContain('bg-accent-container');
  const label = screen.getByText('Upload');
  expect(label.props.className).toContain('text-on-accent');
  expect(label.props.className).not.toContain('text-on-accent-container');
});

test('tonal tone fills with accent-container + on-accent-container content', async () => {
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} tone="tonal" testID="fab" />);
  const surface = screen.getByTestId('fab');
  expect(surface.props.className).toContain('bg-accent-container');
  const label = screen.getByText('Upload');
  expect(label.props.className).toContain('text-on-accent-container');
});

test('extended fab uses the M3 16dp rounded-square corner (not a full pill)', async () => {
  await render(<ZFab label="Upload" icon={<Text>+</Text>} onPress={() => {}} testID="fab" />);
  const surface = screen.getByTestId('fab');
  expect(surface.props.className).toContain('rounded-[16px]');
  expect(surface.props.className).not.toContain('rounded-full');
});

// ── Android native content-hug (source-level scan) ────────────────────────────
// jest cannot render the Jetpack Compose ExtendedFloatingActionButton, so the
// content-hug fix in z-fab.android.tsx (the extended FAB must NEVER stretch to
// the wrapper's full width) is verified by scanning the source. The root cause
// was a default `alignItems: 'stretch'` on the outer wrapper <View> stretching
// the flexible-width native Host; the canonical fix is an INNER content-hug
// view with `alignSelf: 'flex-end'` that overrides the parent's cross-axis
// stretch so the Host sizes to its Compose content and pins bottom-right.
describe('z-fab.android content-hug (source scan)', () => {
  const androidSrc = readFileSync(path.join(__dirname, 'z-fab.android.tsx'), 'utf-8');

  it('wraps the Host in an alignSelf:flex-end content-hug view', () => {
    expect(androidSrc).toMatch(/alignSelf:\s*['"]flex-end['"]/);
  });

  it('does NOT keep the ineffective outer alignSelf:flex-start guard', () => {
    // alignSelf on the absolutely-positioned outer wrapper is ignored, so the
    // earlier `alignSelf: 'flex-start'` guard never hugged content — it must go.
    expect(androidSrc).not.toMatch(/alignSelf:\s*['"]flex-start['"]/);
  });

  it('still forwards className + style on the outer positioning View', () => {
    // The native-classname-forwarding contract: consumer positioning classes
    // ("absolute right-6") + dynamic bottom inset must reach an outer View.
    expect(androidSrc).toMatch(/className=\{className\}/);
    expect(androidSrc).toMatch(/style=\{style\}/);
  });
});
