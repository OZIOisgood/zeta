import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ZDivider } from './z-divider';

function flatLineStyle(testID = 'divider') {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;
}

test('horizontal default stretches to fill width (no width:100% → no inset overflow)', async () => {
  await render(<ZDivider testID="divider" />);
  const s = flatLineStyle();
  expect(s.alignSelf).toBe('stretch');
  expect(s.width).toBeUndefined();
  expect(Number(s.height)).toBeGreaterThan(0);
  expect(typeof s.backgroundColor).toBe('string');
  expect(s.marginStart).toBeUndefined();
});

test('vertical renders a thin full-height outline rule', async () => {
  await render(<ZDivider vertical testID="divider" />);
  const s = flatLineStyle();
  expect(Number(s.width)).toBeGreaterThan(0);
  expect(s.height).toBe('100%');
});

test('inset (boolean) applies the 16dp leading inset as a margin, not via width', async () => {
  await render(<ZDivider inset testID="divider" />);
  const s = flatLineStyle();
  expect(s.marginStart).toBe(16);
  expect(s.alignSelf).toBe('stretch');
  expect(s.width).toBeUndefined();
});

test('inset (number) is used verbatim for leading-aligned grouped separators', async () => {
  await render(<ZDivider inset={58} testID="divider" />);
  expect(flatLineStyle().marginStart).toBe(58);
});

test('forwards consumer className onto the line node', async () => {
  await render(<ZDivider className="my-8" testID="divider" />);
  expect(screen.getByTestId('divider').props.className).toContain('my-8');
});

test('forwards testID', async () => {
  await render(<ZDivider testID="custom-divider" />);
  expect(screen.getByTestId('custom-divider')).toBeOnTheScreen();
});
