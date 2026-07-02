// Import from the legacy entry: `createEventInCalendarAsync` is deprecated on the
// main `expo-calendar` export (logs a warning) but stable under `/legacy`.
import * as Calendar from 'expo-calendar/legacy';

export type CalendarEventInput = {
  /** Event title, e.g. the session type name. */
  title: string;
  /** ISO start (CoachingSlot.starts_at). */
  startsAt: string;
  /** ISO end (CoachingSlot.ends_at). */
  endsAt: string;
  /** Optional notes (e.g. the booking notes). */
  notes?: string;
};

/**
 * Opens the OS "add event" editor pre-filled with the booked session plus a
 * 24h-before alarm, then lets the user confirm in the system UI.
 *
 * Uses `createEventInCalendarAsync` (the system editor) rather than a
 * programmatic `createEventAsync` write so no broad write-permission flow is
 * needed — the OS dialog owns the confirmation, gated only by the
 * `calendarPermission` usage string (app.json expo-calendar plugin).
 *
 * Non-fatal by design: a user cancel returns normally, and before the dev
 * client is rebuilt with the `expo-calendar` native module the call throws
 * `UnavailabilityError` — both are swallowed so the success screen never crashes.
 */
export async function addSessionToCalendar(input: CalendarEventInput): Promise<void> {
  try {
    await Calendar.createEventInCalendarAsync({
      title: input.title,
      startDate: new Date(input.startsAt),
      endDate: new Date(input.endsAt),
      notes: input.notes,
      alarms: [{ relativeOffset: -1440 }], // 24h before start (minutes)
    });
  } catch {
    // Module not in the current build yet, or user dismissed — nothing to do.
  }
}
