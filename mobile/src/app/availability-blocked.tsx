import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCreateBlockedSlotMutation } from '../api/queries/coaching';
import { SheetHeader } from '../components/sheet-header';
import { ZButton } from '../components/ui/z-button';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect } from '../components/ui/z-select';
import { ZSwitch } from '../components/ui/z-switch';
import { ZTextInput } from '../components/ui/z-text-input';
import { showToast } from '../components/ui/z-toast';
import { dateOptions, TIME_OPTIONS } from '../lib/availability-options';
import { localDateKey } from '../lib/datetime';

/**
 * Block-time add — native formSheet (presentation set in _layout.tsx).
 * Layout per the handoff mock (screens3 "Tag blockieren"): date, a full-day
 * SWITCH, Von/Bis side by side only when not full-day, single-line reason.
 * Add-only: the backend has no edit for blocked slots.
 *
 * Params: groupId (required).
 */
export default function AvailabilityBlockedScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { groupId = '' } = useLocalSearchParams<{ groupId: string }>();

  const today = localDateKey(new Date());
  const [date, setDate] = useState(today);
  const [fullDay, setFullDay] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createBlocked = useCreateBlockedSlotMutation(groupId);

  // Per language, not module scope — see dateOptions() in availability-options.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- language drives formatDate() inside
  const dateOpts = useMemo(() => dateOptions(), [i18n.language]);

  async function handleSave() {
    // Pre-submit validation (mirrors handler 400 at blocked_slots.go:134-139)
    if (!date) {
      setFormError(t('sessions.availability.dateRequired'));
      return;
    }
    if (!fullDay) {
      if (start === '') {
        setFormError(t('sessions.availability.startTimeRequired'));
        return;
      }
      if (end === '') {
        setFormError(t('sessions.availability.endTimeRequired'));
        return;
      }
      if (start >= end) {
        setFormError(t('sessions.availability.endBeforeStart'));
        return;
      }
    }
    setFormError(null);
    try {
      await createBlocked.mutateAsync({
        blocked_date: date,
        ...(fullDay ? {} : { start_time: start, end_time: end }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      showToast(t('toast.successTitle'), t('sessions.availability.savedBlockTime'), 'success');
      router.back();
    } catch {
      setFormError(t('sessions.availability.failedBlockTime'));
    }
  }

  const title = t('sessions.availability.addBlockTime');

  return (
    <ZScreen edges={['bottom']} className="flex-1">
      <Stack.Screen options={{ title }} />
      <SheetHeader title={title} onClose={() => router.back()} testID="blocked-sheet-header" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pt-1 pb-6">
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.fields.date')} />
            <ZSelect
              testID="blocked-date"
              value={date}
              options={dateOpts}
              placeholder={t('sessions.availability.selectDatePlaceholder')}
              accessibilityLabel={t('common.fields.date')}
              onValueChange={setDate}
            />
          </View>
          {/* Full-day switch per the handoff mock; the time range only appears
              when a partial-day block is wanted. */}
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-[15px] font-semibold text-z-text">
              {t('common.labels.fullDay')}
            </Text>
            <ZSwitch
              checked={fullDay}
              onChange={setFullDay}
              accessibilityLabel={t('common.labels.fullDay')}
            />
          </View>
          {!fullDay ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <ZFieldLabel label={t('common.fields.startTime')} />
                <ZSelect
                  testID="blocked-start"
                  value={start}
                  options={TIME_OPTIONS}
                  placeholder={t('sessions.availability.selectTimePlaceholder')}
                  accessibilityLabel={t('common.fields.startTime')}
                  onValueChange={setStart}
                />
              </View>
              <View className="flex-1">
                <ZFieldLabel label={t('common.fields.endTime')} />
                <ZSelect
                  testID="blocked-end"
                  value={end}
                  options={TIME_OPTIONS}
                  placeholder={t('sessions.availability.selectTimePlaceholder')}
                  accessibilityLabel={t('common.fields.endTime')}
                  onValueChange={setEnd}
                />
              </View>
            </View>
          ) : null}
          <View>
            <ZFieldLabel label={t('common.fields.reasonOptional')} />
            <ZTextInput
              testID="blocked-reason"
              value={reason}
              onChangeText={setReason}
              accessibilityLabel={t('common.fields.reasonOptional')}
              placeholder={t('sessions.availability.reasonPlaceholder')}
            />
          </View>
        </View>
        {formError ? <Text className="mt-3 text-sm text-z-danger">{formError}</Text> : null}
        {/* M3 dialog footer per the handoff: right-aligned TEXT buttons. */}
        <View className="mt-6 flex-row items-center justify-end gap-4">
          <ZButton
            label={t('common.actions.cancel')}
            variant="ghost"
            onPress={() => router.back()}
          />
          <ZButton
            testID="blocked-save"
            label={t('common.actions.save')}
            variant="link"
            loading={createBlocked.isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZScreen>
  );
}
