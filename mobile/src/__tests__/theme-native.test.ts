import { accentColor, roleColor } from '../theme/native';
test('accentColor returns the brand ember (Material tonal primary) in light', () => {
  expect(accentColor('light')).toBe('#bd4309');
});
test('roleColor resolves a surface role per scheme', () => {
  expect(roleColor('surface', 'dark')).toMatch(/^#/);
  expect(roleColor('surface', 'light')).toBe('#fdf1ea');
});
