import { isJoinable } from './connect-window';

type BookingLike = {
  status: 'pending' | 'done' | 'cancelled';
  scheduled_at: string;
  duration_minutes: number;
};

// Base booking for use in tests: scheduled for 2026-06-12T10:00:00Z, 60 min.
const BASE: BookingLike = {
  status: 'pending',
  scheduled_at: '2026-06-12T10:00:00.000Z',
  duration_minutes: 60,
};

// Window opens at scheduled_at - 15min = 09:45:00Z
// Window closes at scheduled_at + 60min = 11:00:00Z

describe('isJoinable', () => {
  test('returns false before the join window (more than windowMinutes before start)', () => {
    const now = new Date('2026-06-12T09:44:59.999Z'); // 1ms before window opens
    expect(isJoinable(BASE, now)).toBe(false);
  });

  test('returns true exactly at the window start (scheduled_at - windowMinutes)', () => {
    const now = new Date('2026-06-12T09:45:00.000Z'); // exactly window start
    expect(isJoinable(BASE, now)).toBe(true);
  });

  test('returns true mid-session', () => {
    const now = new Date('2026-06-12T10:30:00.000Z');
    expect(isJoinable(BASE, now)).toBe(true);
  });

  test('returns false after the session end (scheduled_at + duration_minutes)', () => {
    const now = new Date('2026-06-12T11:00:00.001Z'); // 1ms after end
    expect(isJoinable(BASE, now)).toBe(false);
  });

  test('returns false for a cancelled booking', () => {
    const booking: BookingLike = { ...BASE, status: 'cancelled' };
    const now = new Date('2026-06-12T10:30:00.000Z');
    expect(isJoinable(booking, now)).toBe(false);
  });

  test('returns false for a done booking', () => {
    const booking: BookingLike = { ...BASE, status: 'done' };
    const now = new Date('2026-06-12T10:30:00.000Z');
    expect(isJoinable(booking, now)).toBe(false);
  });
});
