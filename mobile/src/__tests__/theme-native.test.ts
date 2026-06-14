import { accentColor, roleColor } from '../theme/native';
test('accentColor returns the brand orange in light', () => {
  expect(accentColor('light')).toBe('#ea580c');
});
test('roleColor resolves a surface role per scheme', () => {
  expect(roleColor('surface', 'dark')).toMatch(/^#/);
  expect(roleColor('surface', 'light')).toBe('#ffffff');
});
