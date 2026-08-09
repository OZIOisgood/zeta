/**
 * Shared Storybook fixtures for the composite-component stories.
 *
 * Each value is typed to satisfy the real entity type pulled from the generated
 * openapi schema (via the query-hook re-exports), so the stories exercise the
 * components against the same shapes the app sees at runtime. Every entity a
 * composite consumes gets one representative value plus one edge case
 * (long text / missing optional fields / alternate status).
 *
 * Keep these in sync with the schema — if `pnpm run sync:openapi` changes a
 * field, `tsc` will flag the fixture that no longer satisfies its type.
 */
import type { Asset } from '../../api/queries/assets';
import type { Group, GroupUser } from '../../api/queries/groups';
import type { Booking, CoachingAvailability, SessionType } from '../../api/queries/coaching';
import type { NotificationItem } from '../../api/queries/notifications';
import type { Review } from '../../api/queries/reviews';
import type { UploadJob } from '../../upload/upload-store';

// A single, fixed 1x1 transparent PNG used wherever a fixture needs a non-null
// avatar/thumbnail. Keeping one constant avoids scattering base64 blobs around.
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const LONG_TEXT =
  'Advanced footwork, balance, and tempo control for competitive sparring — a deliberately long description used to verify wrapping and truncation behavior in the composite components.';

// ── Group ───────────────────────────────────────────────────────────────────

/** Representative group: short name, avatar set. */
export const mockGroup: Group = {
  id: 'grp_01HZX0000000000000000000A',
  name: 'Brazilian Jiu-Jitsu',
  owner_id: 'usr_owner_0001',
  avatar: SAMPLE_IMAGE,
  description: 'Weekly drilling and rolling fundamentals.',
  created_at: '2026-01-12T09:00:00Z',
  updated_at: '2026-05-30T14:30:00Z',
};

/** Edge case: very long name + empty description + no avatar (null). */
export const mockGroupLong: Group = {
  id: 'grp_01HZX0000000000000000000B',
  name: 'Advanced Competition Preparation & Conditioning — Saturday Cohort (2026 Season)',
  owner_id: 'usr_owner_0002',
  avatar: null,
  description: '',
  created_at: '2026-02-01T08:00:00Z',
  updated_at: '2026-06-10T11:15:00Z',
};

// ── Asset (video) ────────────────────────────────────────────────────────────

/** Representative asset: completed, thumbnail + playback id present. */
export const mockAsset: Asset = {
  id: 'ast_01HZX0000000000000000000A',
  title: 'Guard retention drill',
  description: 'Three rounds of guard retention against a resisting partner.',
  owner_id: 'usr_owner_0001',
  status: 'completed',
  thumbnail: SAMPLE_IMAGE,
  playback_id: 'pb_completed_0001',
  review_count: 4,
  group: { id: mockGroup.id, name: mockGroup.name },
};

/** Edge case: still processing — no thumbnail/playback id yet, long title. */
export const mockAssetProcessing: Asset = {
  id: 'ast_01HZX0000000000000000000B',
  title: 'Open mat sparring session — full unedited recording with multiple rounds',
  description: LONG_TEXT,
  owner_id: 'usr_owner_0001',
  status: 'pending',
  review_count: 0,
  group: { id: mockGroup.id, name: mockGroup.name },
};

/** Edge case: waiting for upload to finish — alternate status, no group. */
export const mockAssetFailed: Asset = {
  id: 'ast_01HZX0000000000000000000C',
  title: 'Takedown entries',
  description: '',
  owner_id: 'usr_owner_0001',
  status: 'waiting_upload',
  review_count: 0,
};

// ── Booking ──────────────────────────────────────────────────────────────────

/** Representative booking: upcoming (pending), notes present. */
export const mockBookingUpcoming: Booking = {
  id: 'bkg_01HZX0000000000000000000A',
  expert_id: 'usr_expert_0001',
  expert_name: 'Marina Costa',
  student_id: 'usr_student_0001',
  student_name: 'Liam Becker',
  group_id: mockGroup.id,
  session_type_id: 'stp_01HZX0000000000000000000A',
  session_type_name: 'Technique review',
  scheduled_at: '2026-07-02T15:00:00Z',
  duration_minutes: 45,
  status: 'pending',
  notes: 'Would like to focus on closed-guard sweeps.',
  created_at: '2026-06-12T10:00:00Z',
};

/** Edge case: past booking, marked done, no optional fields. */
export const mockBookingPast: Booking = {
  id: 'bkg_01HZX0000000000000000000B',
  expert_id: 'usr_expert_0001',
  expert_name: 'Marina Costa',
  student_id: 'usr_student_0002',
  student_name: 'Sofia Hartmann-Vasquez',
  group_id: mockGroup.id,
  session_type_id: 'stp_01HZX0000000000000000000A',
  scheduled_at: '2026-05-01T09:30:00Z',
  duration_minutes: 30,
  status: 'done',
  created_at: '2026-04-20T12:00:00Z',
};

// ── SessionType ──────────────────────────────────────────────────────────────

/** Representative active session type. */
export const mockSessionType: SessionType = {
  id: 'stp_01HZX0000000000000000000A',
  expert_id: 'usr_expert_0001',
  group_id: mockGroup.id,
  name: 'Technique review',
  description: 'Targeted feedback on a single position or sequence.',
  duration_minutes: 45,
  is_active: true,
  created_at: '2026-03-01T08:00:00Z',
};

// ── Member (GroupUser) ───────────────────────────────────────────────────────

/** Representative member: expert role, avatar set. */
export const mockMember: GroupUser = {
  id: 'usr_member_0001',
  email: 'marina.costa@example.com',
  first_name: 'Marina',
  last_name: 'Costa',
  avatar: SAMPLE_IMAGE,
  role: 'expert',
};

/** Edge case: student role, no avatar (falls back to initials), long surname. */
export const mockMemberPending: GroupUser = {
  id: 'usr_member_0002',
  email: 'sofia.hartmann-vasquez@example.com',
  first_name: 'Sofia',
  last_name: 'Hartmann-Vasquez',
  role: 'student',
};

// ── Notification ─────────────────────────────────────────────────────────────

/** Representative notification: unread, actionable group invitation. */
export const mockNotificationUnread: NotificationItem = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'group_invitation_received',
  payload: {
    group_id: mockGroup.id,
    group_name: mockGroup.name,
    inviter_name: 'Marina Costa',
    code: 'INV-ABC123',
  },
  read: false,
  invite_status: 'pending',
  created_at: '2026-06-13T18:45:00Z',
};

/** Edge case: read, different type (video reviewed), no invite_status. */
export const mockNotificationRead: NotificationItem = {
  id: '22222222-2222-4222-8222-222222222222',
  type: 'video_reviewed',
  payload: {
    asset_id: mockAsset.id,
    video_title: mockAsset.title,
    reviewer_name: 'Marina Costa',
  },
  read: true,
  created_at: '2026-06-10T09:12:00Z',
};

// ── Review ───────────────────────────────────────────────────────────────────

/** Representative review: timestamped, author with avatar. */
export const mockReview: Review = {
  id: 'rev_01HZX0000000000000000000A',
  content: 'Nice grip break here — keep your elbow tighter to your hip on the recovery.',
  timestamp_seconds: 75,
  author: { name: 'Marina Costa', avatar: SAMPLE_IMAGE },
  created_at: '2026-06-11T16:20:00Z',
};

// ── Schedule day (CoachingAvailability) ──────────────────────────────────────

/** Representative weekly availability row (used by ScheduleDayRow). */
export const mockAvailability: CoachingAvailability = {
  id: 'avl_01HZX0000000000000000000A',
  expert_id: 'usr_expert_0001',
  group_id: mockGroup.id,
  day_of_week: 1,
  start_time: '09:00',
  end_time: '12:00',
  is_active: true,
  created_at: '2026-03-01T08:00:00Z',
};

// ── Stat (StatCard) ──────────────────────────────────────────────────────────

/** Plain prop bag for StatCard — label + count (icon/footer supplied by story). */
export const mockStat: { label: string; count: number } = {
  label: 'Videos',
  count: 12,
};

// ── Upload job (UploadProgressCard) ──────────────────────────────────────────

/** Representative in-flight upload: one file done, one uploading. */
export const mockUploadInProgress: UploadJob = {
  id: 'ast_upload_0001',
  title: 'Open mat sparring',
  status: 'uploading',
  files: [
    {
      videoId: 'vid_0001',
      uploadUrl: 'https://upload.example.com/0001',
      localUri: 'file:///tmp/round-1.mp4',
      filename: 'round-1.mp4',
      progress: 1,
      status: 'done',
    },
    {
      videoId: 'vid_0002',
      uploadUrl: 'https://upload.example.com/0002',
      localUri: 'file:///tmp/round-2.mp4',
      filename: 'round-2.mp4',
      progress: 0.4,
      status: 'uploading',
    },
  ],
};

/** Edge case: failed upload with a long title and a failed file. */
export const mockUploadFailed: UploadJob = {
  id: 'ast_upload_0002',
  title: 'Advanced competition preparation — full session recording (multiple parts)',
  status: 'failed',
  files: [
    {
      videoId: 'vid_0003',
      uploadUrl: 'https://upload.example.com/0003',
      localUri: 'file:///tmp/part-1.mp4',
      filename: 'part-1.mp4',
      progress: 0.6,
      status: 'failed',
    },
  ],
};
