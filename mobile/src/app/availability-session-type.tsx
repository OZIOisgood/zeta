import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  useCreateSessionTypeMutation,
  useSessionTypesQuery,
  useUpdateSessionTypeMutation,
} from '../api/queries/coaching';
import { SheetHeader } from '../components/sheet-header';
import { ZButton } from '../components/ui/z-button';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect, type ZSelectOption } from '../components/ui/z-select';
import { ZTextInput } from '../components/ui/z-text-input';
import { ZTextarea } from '../components/ui/z-textarea';
import { showToast } from '../components/ui/z-toast';
import { DURATION_VALUES } from '../lib/availability-options';

/**
 * Session-type add/edit — native formSheet (presentation set in _layout.tsx).
 * Replaces the availability.tsx inline ZDialogPanel sheet: the native sheet is
 * the platform-correct container for form input (mobile/AGENTS.md SOTA table)
 * and handles the keyboard automatically (no ZKeyboardAvoidingView).
 *
 * Params: groupId (required), sessionTypeId (optional → edit mode). The item
 * to edit comes from the warm session-types list cache — the user tapped its
 * row a moment ago, so no extra fetch.
 */
export default function AvailabilitySessionTypeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { groupId = '', sessionTypeId } = useLocalSearchParams<{
    groupId: string;
    sessionTypeId?: string;
  }>();

  const typesQuery = useSessionTypesQuery(groupId);
  const editing = sessionTypeId
    ? ((typesQuery.data ?? []).find((s) => s.id === sessionTypeId) ?? null)
    : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [duration, setDuration] = useState(String(editing?.duration_minutes ?? 45));
  const [nameTouched, setNameTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createType = useCreateSessionTypeMutation(groupId);
  const updateType = useUpdateSessionTypeMutation(groupId);

  const durationOptions = useMemo<ZSelectOption[]>(
    () =>
      DURATION_VALUES.map((m) => ({
        value: String(m),
        label: t('common.labels.minutesShort', { count: m }),
      })),
    [t],
  );

  const isPending = createType.isPending || updateType.isPending;
  const nameInvalid = nameTouched && name.trim() === '';
  const title = editing
    ? t('sessions.availability.editSessionType')
    : t('sessions.availability.addSessionType');

  async function handleSave() {
    setNameTouched(true);
    if (name.trim() === '') {
      setFormError(t('sessions.availability.nameRequired'));
      return;
    }
    setFormError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        duration_minutes: Number(duration),
      };
      if (editing) {
        await updateType.mutateAsync({ sessionTypeId: editing.id, body });
      } else {
        await createType.mutateAsync(body);
      }
      showToast(t('toast.successTitle'), t('sessions.availability.savedSessionType'), 'success');
      router.back();
    } catch {
      setFormError(
        editing
          ? t('sessions.availability.failedUpdateSessionType')
          : t('sessions.availability.failedCreateSessionType'),
      );
    }
  }

  return (
    <ZScreen edges={['bottom']} className="flex-1">
      <Stack.Screen options={{ title }} />
      {/* Android renders no formSheet header — in-content title + close
          (SheetHeader renders null on iOS, which keeps the native header). */}
      <SheetHeader title={title} onClose={() => router.back()} testID="session-type-sheet-header" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pt-1 pb-6">
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.fields.name')} />
            <ZTextInput
              testID="session-type-name"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameTouched(true);
              }}
              accessibilityLabel={t('common.fields.name')}
              placeholder={t('sessions.availability.namePlaceholder')}
              invalid={nameInvalid}
            />
            {nameInvalid ? (
              <ZFieldError message={t('sessions.availability.nameRequired')} />
            ) : null}
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.description')} />
            <ZTextarea
              testID="session-type-description"
              value={description}
              onChangeText={setDescription}
              accessibilityLabel={t('common.fields.description')}
              placeholder={t('sessions.availability.descriptionPlaceholder')}
              rows={3}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.duration')} />
            <ZSelect
              testID="session-type-duration"
              value={duration}
              options={durationOptions}
              accessibilityLabel={t('common.fields.duration')}
              onValueChange={setDuration}
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
            testID="session-type-save"
            label={t('common.actions.save')}
            loading={isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZScreen>
  );
}
