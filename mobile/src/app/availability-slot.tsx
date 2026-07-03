import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  useCreateAvailabilityMutation,
  useMyAvailabilityQuery,
  useUpdateAvailabilityMutation,
} from '../api/queries/coaching';
import { SheetHeader } from '../components/sheet-header';
import { ZButton } from '../components/ui/z-button';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect, type ZSelectOption } from '../components/ui/z-select';
import { showToast } from '../components/ui/z-toast';
import { TIME_OPTIONS } from '../lib/availability-options';

/**
 * Weekly-availability add/edit — native formSheet (presentation set in
 * _layout.tsx). Replaces the availability.tsx inline ZDialogPanel sheet.
 *
 * Params: groupId (required), availabilityId (optional → edit mode). The item
 * to edit comes from the warm availability list cache.
 */
export default function AvailabilitySlotScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { groupId = '', availabilityId } = useLocalSearchParams<{
    groupId: string;
    availabilityId?: string;
  }>();

  const availabilityQuery = useMyAvailabilityQuery(groupId);
  const editing = availabilityId
    ? ((availabilityQuery.data ?? []).find((a) => a.id === availabilityId) ?? null)
    : null;

  const [day, setDay] = useState(editing ? String(editing.day_of_week) : '1');
  const [start, setStart] = useState(editing?.start_time ?? '09:00');
  const [end, setEnd] = useState(editing?.end_time ?? '17:00');
  const [formError, setFormError] = useState<string | null>(null);

  const createAvail = useCreateAvailabilityMutation(groupId);
  const updateAvail = useUpdateAvailabilityMutation(groupId);
  const isPending = createAvail.isPending || updateAvail.isPending;

  const dayOptions = useMemo<ZSelectOption[]>(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`weekdays.${d}`) })),
    [t],
  );

  const title = editing
    ? t('sessions.availability.editAvailability')
    : t('sessions.availability.addAvailability');

  async function handleSave() {
    // Pre-submit time-order validation (mirrors handler 400 at helpers.go:70)
    if (start >= end) {
      setFormError(t('sessions.availability.endBeforeStart'));
      return;
    }
    setFormError(null);
    try {
      const body = { day_of_week: Number(day), start_time: start, end_time: end };
      if (editing) {
        await updateAvail.mutateAsync({ availabilityId: editing.id, body });
      } else {
        await createAvail.mutateAsync(body);
      }
      showToast(t('toast.successTitle'), t('sessions.availability.savedAvailability'), 'success');
      router.back();
    } catch {
      setFormError(
        editing
          ? t('sessions.availability.failedUpdateAvailability')
          : t('sessions.availability.failedAddAvailability'),
      );
    }
  }

  return (
    <ZScreen edges={['bottom']} className="flex-1">
      <Stack.Screen options={{ title }} />
      <SheetHeader title={title} onClose={() => router.back()} testID="slot-sheet-header" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pt-1 pb-6">
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.labels.day')} />
            <ZSelect
              testID="slot-day"
              value={day}
              options={dayOptions}
              placeholder={t('sessions.availability.selectDayPlaceholder')}
              accessibilityLabel={t('common.labels.day')}
              onValueChange={setDay}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.startTime')} />
            <ZSelect
              testID="slot-start"
              value={start}
              options={TIME_OPTIONS}
              placeholder={t('sessions.availability.selectTimePlaceholder')}
              accessibilityLabel={t('common.fields.startTime')}
              onValueChange={setStart}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.endTime')} />
            <ZSelect
              testID="slot-end"
              value={end}
              options={TIME_OPTIONS}
              placeholder={t('sessions.availability.selectTimePlaceholder')}
              accessibilityLabel={t('common.fields.endTime')}
              onValueChange={setEnd}
            />
          </View>
        </View>
        {formError ? <Text className="mt-3 text-sm text-z-danger">{formError}</Text> : null}
        <View className="mt-6 flex-row justify-end gap-2">
          <ZButton
            label={t('common.actions.cancel')}
            variant="secondary"
            onPress={() => router.back()}
          />
          <ZButton
            testID="slot-save"
            label={t('common.actions.save')}
            loading={isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZScreen>
  );
}
