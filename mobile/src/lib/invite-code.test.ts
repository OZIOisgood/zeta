import { parseInviteCode } from './invite-code';

describe('parseInviteCode', () => {
  test('web URL with invite query param returns the code case-preserved', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?invite=abc123')).toBe('abc123');
  });

  test('URL with extra query params still extracts invite code', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?foo=bar&invite=xYz789&baz=1')).toBe('xYz789');
  });

  test('raw code is returned case-preserved', () => {
    expect(parseInviteCode('abc123')).toBe('abc123');
  });

  // Backend codes come from a mixed-case alphabet [A-Za-z0-9] and are looked up
  // case-sensitively, so mixed-case codes must round-trip untouched.
  test('mixed-case code from a URL is preserved exactly', () => {
    expect(parseInviteCode('https://app.zeta.example/groups?invite=aB3xK9')).toBe('aB3xK9');
  });

  test('mixed-case raw code is preserved exactly', () => {
    expect(parseInviteCode('aB3xK9')).toBe('aB3xK9');
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
