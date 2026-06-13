import { parseInviteCode } from './invite-code';

describe('parseInviteCode', () => {
  test('web URL with invite query param returns the code uppercased', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?invite=abc123')).toBe('ABC123');
  });

  test('URL with extra query params still extracts invite code', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?foo=bar&invite=xYz789&baz=1')).toBe('XYZ789');
  });

  test('raw lowercase code is uppercased', () => {
    expect(parseInviteCode('abc123')).toBe('ABC123');
  });

  test('junk string returns empty string', () => {
    expect(parseInviteCode('not-a-valid!!code')).toBe('');
  });

  test('URL without invite param returns empty string', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?foo=bar')).toBe('');
  });

  test('empty string returns empty string', () => {
    expect(parseInviteCode('')).toBe('');
  });
});
