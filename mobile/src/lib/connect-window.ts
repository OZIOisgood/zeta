import type { components } from '../api/schema';

type BookingLike = Pick<
  components['schemas']['Booking'],
  'status' | 'scheduled_at' | 'duration_minutes'
>;

/**
 * Whether the Join affordance should show: the booking is not cancelled and now
 * falls within [scheduled_at - windowMinutes, scheduled_at + duration].
 *
 * Mirrors the server rule in internal/coaching/connect.go, which checks
 * `IsCancelled` plus the same window — and nothing else. Gating on
 * `status === 'pending'` was wrong: the API derives the status at response time
 * and returns 'done' from scheduled_at onwards, so that check hid the Join
 * button for the entire duration of a session that was actually running. The
 * web dashboard has always allowed this case.
 *
 * Slightly stricter than the server at the tail end, which additionally grants a
 * recording grace period past scheduled_at + duration.
 */
export function isJoinable(booking: BookingLike, now: Date, windowMinutes = 15): boolean {
  if (booking.status === 'cancelled') return false;

  const scheduledAt = new Date(booking.scheduled_at).getTime();
  const windowStart = scheduledAt - windowMinutes * 60 * 1000;
  const sessionEnd = scheduledAt + booking.duration_minutes * 60 * 1000;
  const nowMs = now.getTime();

  return nowMs >= windowStart && nowMs <= sessionEnd;
}
