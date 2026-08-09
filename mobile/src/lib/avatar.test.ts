import { initialsFromName } from './avatar';

describe('initialsFromName', () => {
  it('takes the first letter of up to two words, uppercased', () => {
    expect(initialsFromName('Acme')).toBe('A');
    expect(initialsFromName('ada lovelace')).toBe('AL');
    expect(initialsFromName('Grace Brewster Hopper')).toBe('GB');
  });
  it('collapses irregular whitespace', () => {
    expect(initialsFromName('  acme   corp ')).toBe('AC');
  });
  it('returns the default fallback for an empty name', () => {
    expect(initialsFromName('')).toBe('?');
    expect(initialsFromName('   ')).toBe('?');
  });
  it('honours a custom fallback', () => {
    expect(initialsFromName('', 'G')).toBe('G');
  });
});
