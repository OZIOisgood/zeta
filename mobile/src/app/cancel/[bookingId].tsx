import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  formatBookingDateTime,
  useCancelBookingMutation,
  useMyBookingsQuery,
} from '../../api/queries/coaching';
import { useAuth } from '../../auth/auth-store';
import { ZButton } from '../../components/ui/z-button';
import { ZFieldError } from '../../components/ui/z-field-error';
import { ZScreen } from '../../components/ui/z-screen';
import { ZTextarea } from '../../components/ui/z-textarea';
import { showToast } from '../../components/ui/z-toast';

/**
 * Cancel-session confirmation — native formSheet (presentation set in
 * _layout.tsx). Replaces the broken ZConfirmDialog-with-children path
 * (ZDialogPanel Compose ModalBottomSheet, which rendered overlapping content +
 * detached buttons on device). Per mobile/AGENTS.md SOTA: a confirm that captures
 * input (the optional cancellation reason) belongs in a native sheet, not an
 * Alert (HIG: alerts must not contain text fields). Reached by swiping a booking
 * card to reveal the Cancel action (booking-card.tsx).
 *
 * The native formSheet handles the keyboard automatically, so no
 * ZKeyboardAvoidingView (per the AGENTS.md keyboard rule for native sheets).
 */
export default function CancelSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookingId, groupId } = useLocalSearchParams<{ bookingId: string; groupId?: string }>();
  const currentUserId = useAuth((s) => s.user?.id ?? '');

  // The booking comes from the warm list cache (the user swiped it on the
  // Sessions list). group_id from the booking drives the mutation; the `groupId`
  // param is a fallback so cancellation still works if the cache is cold.
  const { data } = useMyBookingsQuery();
  const booking = (data ?? []).find((b) => b.id === bookingId) ?? null;
  const resolvedGroupId = booking?.group_id ?? groupId ?? '';

  const { mutateAsync, isPending } = useCancelBookingMutation(resolvedGroupId);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Counterpart for the context line: the student sees the expert, the expert
  // sees the student (mirrors web cancelDescription()).
  const otherParty = booking
    ? booking.student_id === currentUserId
      ? (booking.expert_name ?? booking.expert_id)
      : (booking.student_name ?? booking.student_id)
    : '';
  const scheduledAt = booking ? formatBookingDateTime(booking.scheduled_at) : '';

  async function handleCancel() {
    if (!bookingId) return;
    setError(null);
    const trimmed = reason.trim();
    try {
      await mutateAsync({ bookingId, reason: trimmed === '' ? undefined : trimmed });
      showToast(t('toast.successTitle'), undefined, 'success');
      router.back();
    } catch {
      setError(t('sessions.cancel.failed'));
    }
  }

  return (
    <ZScreen edges={['bottom']} className="flex-1 px-4 pt-3">
      <Stack.Screen options={{ title: t('sessions.cancel.title') }} />
      {/* Compact confirm: title (native header) → context → reason → actions,
          top-aligned so every control is visible at the opening (0.5) detent.
          No flex-1 spacer — a confirmation sheet hugs its content rather than
          stranding the actions at the screen bottom (hidden below the fold). */}
      <View className="gap-4">
        {otherParty && scheduledAt ? (
          <Text className="text-base leading-6 text-z-text">
            {t('sessions.cancel.descriptionText', { otherParty, scheduledAt })}
          </Text>
        ) : null}
        <ZTextarea
          testID="cancel-reason"
          value={reason}
          onChangeText={setReason}
          accessibilityLabel={t('sessions.cancel.title')}
          placeholder={t('sessions.cancel.placeholder')}
          rows={3}
          disabled={isPending}
        />
        {error ? <ZFieldError message={error} /> : null}
        <View className="gap-2 pt-1">
          <ZButton
            testID="cancel-confirm"
            label={t('sessions.cancel.title')}
            variant="danger"
            disabled={isPending}
            onPress={() => void handleCancel()}
          />
          <ZButton
            testID="cancel-keep"
            label={t('sessions.cancel.keep')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </ZScreen>
  );
}
