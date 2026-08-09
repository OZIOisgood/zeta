import type { components } from '../api/schema';

type BookingLike = Pick<
  components['schemas']['Booking'],
  'status' | 'scheduled_at' | 'duration_minutes'
>;

/** Whether the Join affordance should show: pending booking, within
 *  [scheduled_at - windowMinutes, scheduled_at + duration]. The server
 *  enforces the same rule on /connect. */
export function isJoinable(booking: BookingLike, now: Date, windowMinutes = 15): boolean {
  if (booking.status !== 'pending') return false;

  const scheduledAt = new Date(booking.scheduled_at).getTime();
  const windowStart = scheduledAt - windowMinutes * 60 * 1000;
  const sessionEnd = scheduledAt + booking.duration_minutes * 60 * 1000;
  const nowMs = now.getTime();

  return nowMs >= windowStart && nowMs <= sessionEnd;
}
