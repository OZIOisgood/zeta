import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type {
  CoachingAvailability,
  CoachingBlockedSlot,
  SessionType,
} from '../api/queries/coaching';
import {
  useBlockedSlotsQuery,
  useCreateAvailabilityMutation,
  useCreateBlockedSlotMutation,
  useCreateSessionTypeMutation,
  useDeactivateSessionTypeMutation,
  useDeleteAvailabilityMutation,
  useDeleteBlockedSlotMutation,
  useMyAvailabilityQuery,
  useSessionTypesQuery,
  useUpdateAvailabilityMutation,
  useUpdateSessionTypeMutation,
} from '../api/queries/coaching';
import { useGroupsQuery } from '../api/queries/groups';
import { useAuth } from '../auth/auth-store';
import { formatDate } from '../lib/datetime';
import { ScheduleDayRow } from '../components/schedule-day-row';
import { SessionTypeRow } from '../components/session-type-row';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZConfirmDialog } from '../components/ui/z-confirm-dialog';
import { ZDialogPanel } from '../components/ui/z-dialog-panel';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZIconTile } from '../components/ui/z-icon-tile';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect, type ZSelectOption } from '../components/ui/z-select';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTabs } from '../components/ui/z-tabs';
import { ZTextInput } from '../components/ui/z-text-input';
import { ZTextarea } from '../components/ui/z-textarea';
import { showToast } from '../components/ui/z-toast';
import { colors } from '../theme/colors';

type Section = 'session-types' | 'schedule' | 'blocked';

// Duration VALUES only; the `label` is built at render time via
// t('common.labels.minutesShort', { count }) so it shares the reports minutes
// key — do NOT hardcode `${m} min`.
const DURATION_VALUES: number[] = Array.from(
  { length: (120 - 15) / 5 + 1 },
  (_, i) => 15 + i * 5,
);

function timeOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ value: v, label: v });
    }
  }
  return out;
}
const TIME_OPTIONS = timeOptions();

function dateOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  const today = new Date();
  for (let i = 0; i < 90; i += 1) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10); // YYYY-MM-DD (the API value)
    // Label via the shared datetime helper — no per-screen formatter.
    out.push({ value, label: formatDate(value) });
  }
  return out;
}
const DATE_OPTIONS = dateOptions();

// ── Session-type sheet (add / edit) ──────────────────────────────────────────

function SessionTypeSheet({
  editing,
  groupId,
  onClose,
}: {
  editing: SessionType | null;
  groupId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
      showToast(t('toast.successTitle'), undefined, 'success');
      onClose();
    } catch {
      setFormError(
        editing
          ? t('sessions.availability.failedUpdateSessionType')
          : t('sessions.availability.failedCreateSessionType'),
      );
    }
  }

  return (
    <ZDialogPanel
      visible
      onClose={onClose}
      closeLabel={t('common.actions.cancel')}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-base font-semibold text-z-text">
          {editing
            ? t('sessions.availability.editSessionType')
            : t('sessions.availability.addSessionType')}
        </Text>
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.fields.name')} />
            <ZTextInput
              value={name}
              onChangeText={(v) => { setName(v); setNameTouched(true); }}
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
              value={duration}
              options={durationOptions}
              accessibilityLabel={t('common.fields.duration')}
              onValueChange={setDuration}
            />
          </View>
        </View>
        {formError ? (
          <Text className="mt-3 text-sm text-z-danger">{formError}</Text>
        ) : null}
        <View className="mt-6 flex-row justify-end gap-2">
          <ZButton
            label={t('common.actions.cancel')}
            variant="secondary"
            onPress={onClose}
          />
          <ZButton
            label={t('common.actions.save')}
            loading={isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZDialogPanel>
  );
}

// ── Availability sheet (add / edit) ───────────────────────────────────────────

function AvailabilitySheet({
  editing,
  groupId,
  dayOptions,
  onClose,
}: {
  editing: CoachingAvailability | null;
  groupId: string;
  dayOptions: ZSelectOption[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [day, setDay] = useState(editing ? String(editing.day_of_week) : '1');
  const [start, setStart] = useState(editing?.start_time ?? '09:00');
  const [end, setEnd] = useState(editing?.end_time ?? '17:00');
  const [formError, setFormError] = useState<string | null>(null);

  const createAvail = useCreateAvailabilityMutation(groupId);
  const updateAvail = useUpdateAvailabilityMutation(groupId);
  const isPending = createAvail.isPending || updateAvail.isPending;

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
      showToast(t('toast.successTitle'), undefined, 'success');
      onClose();
    } catch {
      setFormError(
        editing
          ? t('sessions.availability.failedUpdateAvailability')
          : t('sessions.availability.failedAddAvailability'),
      );
    }
  }

  return (
    <ZDialogPanel visible onClose={onClose} closeLabel={t('common.actions.cancel')}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-base font-semibold text-z-text">
          {editing
            ? t('sessions.availability.editAvailability')
            : t('sessions.availability.addAvailability')}
        </Text>
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.labels.day')} />
            <ZSelect
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
              value={end}
              options={TIME_OPTIONS}
              placeholder={t('sessions.availability.selectTimePlaceholder')}
              accessibilityLabel={t('common.fields.endTime')}
              onValueChange={setEnd}
            />
          </View>
        </View>
        {formError ? (
          <Text className="mt-3 text-sm text-z-danger">{formError}</Text>
        ) : null}
        <View className="mt-6 flex-row justify-end gap-2">
          <ZButton label={t('common.actions.cancel')} variant="secondary" onPress={onClose} />
          <ZButton
            label={t('common.actions.save')}
            loading={isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZDialogPanel>
  );
}

// ── Blocked-date sheet (add only — backend has no edit for blocked slots) ─────

function BlockedSheet({
  groupId,
  onClose,
}: {
  groupId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createBlocked = useCreateBlockedSlotMutation(groupId);

  const fullDayOption: ZSelectOption = { value: '', label: t('common.labels.fullDay') };
  const timeOptionsWithEmpty: ZSelectOption[] = [fullDayOption, ...TIME_OPTIONS];

  async function handleSave() {
    // Pre-submit validation (mirrors handler 400 at blocked_slots.go:134-139)
    if (!date) {
      setFormError(t('sessions.availability.dateRequired'));
      return;
    }
    if ((start === '') !== (end === '')) {
      // Exactly one is set
      setFormError(t('sessions.availability.startTimeRequired'));
      return;
    }
    if (start !== '' && end !== '' && start >= end) {
      setFormError(t('sessions.availability.endBeforeStart'));
      return;
    }
    setFormError(null);
    try {
      await createBlocked.mutateAsync({
        blocked_date: date,
        ...(start ? { start_time: start } : {}),
        ...(end ? { end_time: end } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      showToast(t('toast.successTitle'), undefined, 'success');
      onClose();
    } catch {
      setFormError(t('sessions.availability.failedBlockTime'));
    }
  }

  return (
    <ZDialogPanel visible onClose={onClose} closeLabel={t('common.actions.cancel')}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-base font-semibold text-z-text">
          {t('sessions.availability.addBlockTime')}
        </Text>
        <View className="gap-3">
          <View>
            <ZFieldLabel label={t('common.fields.date')} />
            <ZSelect
              value={date}
              options={DATE_OPTIONS}
              placeholder={t('sessions.availability.selectDatePlaceholder')}
              accessibilityLabel={t('common.fields.date')}
              onValueChange={setDate}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.startTime')} />
            <ZSelect
              value={start}
              options={timeOptionsWithEmpty}
              placeholder={t('sessions.availability.selectTimePlaceholder')}
              accessibilityLabel={t('common.fields.startTime')}
              onValueChange={setStart}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.endTime')} />
            <ZSelect
              value={end}
              options={timeOptionsWithEmpty}
              placeholder={t('sessions.availability.selectTimePlaceholder')}
              accessibilityLabel={t('common.fields.endTime')}
              onValueChange={setEnd}
            />
          </View>
          <View>
            <ZFieldLabel label={t('common.fields.reasonOptional')} />
            <ZTextarea
              value={reason}
              onChangeText={setReason}
              accessibilityLabel={t('common.fields.reasonOptional')}
              placeholder={t('sessions.availability.reasonPlaceholder')}
              rows={3}
            />
          </View>
        </View>
        {formError ? (
          <Text className="mt-3 text-sm text-z-danger">{formError}</Text>
        ) : null}
        <View className="mt-6 flex-row justify-end gap-2">
          <ZButton label={t('common.actions.cancel')} variant="secondary" onPress={onClose} />
          <ZButton
            label={t('common.actions.save')}
            loading={createBlocked.isPending}
            onPress={() => void handleSave()}
          />
        </View>
      </ScrollView>
    </ZDialogPanel>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const permissions = useAuth((s) => (s as { user?: { permissions?: string[] } }).user?.permissions ?? null);
  const canManage = permissions !== null && permissions.includes('coaching:availability:manage');

  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data ?? [];
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const groupId = groups.length === 1 ? groups[0].id : selectedGroupId;

  const [section, setSection] = useState<Section>('session-types');

  // ── queries (all gated on a resolved groupId) ──────────────────────────────
  const typesQuery = useSessionTypesQuery(groupId);
  const availabilityQuery = useMyAvailabilityQuery(groupId);
  const blockedQuery = useBlockedSlotsQuery(groupId);

  // ── mutations ──────────────────────────────────────────────────────────────
  const deactivateType = useDeactivateSessionTypeMutation(groupId);
  const deleteAvail = useDeleteAvailabilityMutation(groupId);
  const deleteBlocked = useDeleteBlockedSlotMutation(groupId);

  // ── sheet + dialog state ────────────────────────────────────────────────────
  const [typeSheet, setTypeSheet] = useState<{ editing: SessionType | null } | null>(null);
  const [availSheet, setAvailSheet] = useState<{ editing: CoachingAvailability | null } | null>(
    null,
  );
  const [blockedSheet, setBlockedSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'type'; id: string }
    | { kind: 'avail'; id: string }
    | { kind: 'blocked'; id: string }
    | null
  >(null);

  const dayOptions = useMemo<ZSelectOption[]>(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`weekdays.${d}`) })),
    [t],
  );

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'type') {
        await deactivateType.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.kind === 'avail') {
        await deleteAvail.mutateAsync(deleteTarget.id);
      } else {
        await deleteBlocked.mutateAsync(deleteTarget.id);
      }
      setDeleteTarget(null);
      showToast(t('toast.successTitle'), undefined, 'success');
    } catch {
      setDeleteTarget(null);
      showToast(t('toast.errorTitle'), undefined, 'error');
    }
  }

  // ── permission gate ────────────────────────────────────────────────────────
  if (!canManage) {
    return (
      <ZScreen edges={['bottom']}>
        <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
        <View testID="availability-no-permission" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noPermission')}
            description={t('sessions.availability.noPermissionDescription')}
          />
        </View>
      </ZScreen>
    );
  }

  // ── groups loading / error / no-groups / no-group-selected gates ───────────
  // These must come BEFORE the tabs are built so the three section queries
  // (which are disabled when groupId === '') never render their isPending
  // skeletons in the "no group yet" case.  Mirror the web's status/groups check
  // in manage-availability-page.component.ts lines 127–153.

  if (groupsQuery.isPending) {
    return (
      <ZScreen edges={['bottom']}>
        <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
        <View testID="availability-groups-loading" className="gap-3 p-4">
          <ZSkeleton className="h-32 w-full rounded-lg" />
          <ZSkeleton className="h-32 w-full rounded-lg" />
        </View>
      </ZScreen>
    );
  }

  if (groupsQuery.isError) {
    return (
      <ZScreen edges={['bottom']}>
        <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
        <View testID="availability-groups-error" className="p-4">
          <ZQueryError
            title={t('groups.phase4.loadFailed')}
            onRetry={() => void groupsQuery.refetch()}
          />
        </View>
      </ZScreen>
    );
  }

  if (groups.length === 0) {
    return (
      <ZScreen edges={['bottom']}>
        <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
        <View testID="availability-no-groups" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noGroups')}
            description={t('sessions.availability.noGroupsDescription')}
          />
        </View>
      </ZScreen>
    );
  }

  // Multi-group: show a group-picker prompt until the expert selects one.
  // No tabs or section content until groupId is resolved — this prevents the
  // three section queries from staying in the disabled/pending limbo state.
  if (groupId === '') {
    return (
      <ZScreen edges={['bottom']}>
        <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
        <ZKeyboardAvoidingView>
          <ZCard className="m-4 gap-1">
            <Text className="text-2xl font-semibold text-z-text">
              {t('sessions.availability.title')}
            </Text>
            <Text className="text-sm leading-6 text-z-muted">
              {t('sessions.availability.summary')}
            </Text>
          </ZCard>
          <View testID="availability-group-prompt" className="mx-4 gap-1">
            <ZFieldLabel label={t('common.fields.group')} />
            <ZSelect
              testID="availability-group-select"
              value={undefined}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
              placeholder={t('sessions.book.selectGroup')}
              accessibilityLabel={t('common.fields.group')}
              onValueChange={setSelectedGroupId}
            />
          </View>
        </ZKeyboardAvoidingView>
      </ZScreen>
    );
  }

  const tabs = [
    {
      id: 'session-types',
      label: t('sessions.availability.sessionTypes'),
      count: (typesQuery.data ?? []).length,
    },
    {
      id: 'schedule',
      label: t('sessions.availability.weeklySchedule'),
      count: (availabilityQuery.data ?? []).length,
    },
    {
      id: 'blocked',
      label: t('sessions.availability.blockedDates'),
      count: (blockedQuery.data ?? []).length,
    },
  ];

  // ── section content ────────────────────────────────────────────────────────

  function renderSessionTypes() {
    if (typesQuery.isPending) {
      return (
        <View className="gap-3 p-4">
          <ZSkeleton className="h-24 w-full rounded-lg" />
          <ZSkeleton className="h-24 w-full rounded-lg" />
        </View>
      );
    }
    if (typesQuery.isError) {
      return (
        <View className="p-4">
          <ZQueryError
            title={t('sessions.availability.loadFailedSessionTypes')}
            onRetry={() => void typesQuery.refetch()}
          />
        </View>
      );
    }
    return (
      <FlatList
        className="flex-1"
        data={typesQuery.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="mb-2">
            <ZButton
              label={t('sessions.availability.addSessionType')}
              icon={<ZSymbol name="plus" label={t('sessions.availability.addSessionType')} size={18} color={colors.onPrimary} />}
              onPress={() => setTypeSheet({ editing: null })}
            />
          </View>
        }
        ListEmptyComponent={
          <View testID="availability-empty-session-types">
            <ZEmptyState
              title={t('sessions.availability.noSessionTypes')}
              description={t('sessions.availability.noSessionTypesDescription')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SessionTypeRow
            sessionType={item}
            durationLabel={t('common.labels.minutesShort', { count: item.duration_minutes })}
            editLabel={t('common.actions.edit')}
            deleteLabel={t('common.actions.delete')}
            onEdit={() => setTypeSheet({ editing: item })}
            onDelete={() => setDeleteTarget({ kind: 'type', id: item.id })}
          />
        )}
      />
    );
  }

  function renderSchedule() {
    if (availabilityQuery.isPending) {
      return (
        <View className="gap-3 p-4">
          <ZSkeleton className="h-20 w-full rounded-lg" />
          <ZSkeleton className="h-20 w-full rounded-lg" />
        </View>
      );
    }
    if (availabilityQuery.isError) {
      return (
        <View className="p-4">
          <ZQueryError
            title={t('sessions.availability.loadFailedSchedule')}
            onRetry={() => void availabilityQuery.refetch()}
          />
        </View>
      );
    }
    return (
      <FlatList
        className="flex-1"
        data={availabilityQuery.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="mb-2">
            <ZButton
              label={t('sessions.availability.addAvailability')}
              icon={<ZSymbol name="plus" label={t('sessions.availability.addAvailability')} size={18} color={colors.onPrimary} />}
              onPress={() => setAvailSheet({ editing: null })}
            />
          </View>
        }
        ListEmptyComponent={
          <View testID="availability-empty-schedule">
            <ZEmptyState
              title={t('sessions.availability.noAvailability')}
              description={t('sessions.availability.noAvailabilityDescription')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ScheduleDayRow
            availability={item}
            dayName={t(`weekdays.${item.day_of_week}`)}
            editLabel={t('common.actions.edit')}
            deleteLabel={t('common.actions.delete')}
            onEdit={() => setAvailSheet({ editing: item })}
            onDelete={() => setDeleteTarget({ kind: 'avail', id: item.id })}
          />
        )}
      />
    );
  }

  function renderBlocked() {
    if (blockedQuery.isPending) {
      return (
        <View className="gap-3 p-4">
          <ZSkeleton className="h-20 w-full rounded-lg" />
          <ZSkeleton className="h-20 w-full rounded-lg" />
        </View>
      );
    }
    if (blockedQuery.isError) {
      return (
        <View className="p-4">
          <ZQueryError
            title={t('sessions.availability.loadFailedBlocked')}
            onRetry={() => void blockedQuery.refetch()}
          />
        </View>
      );
    }
    return (
      <FlatList
        className="flex-1"
        data={blockedQuery.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="mb-2">
            <ZButton
              label={t('sessions.availability.addBlockTime')}
              icon={<ZSymbol name="plus" label={t('sessions.availability.addBlockTime')} size={18} color={colors.onPrimary} />}
              onPress={() => setBlockedSheet(true)}
            />
          </View>
        }
        ListEmptyComponent={
          <View testID="availability-empty-blocked">
            <ZEmptyState
              title={t('sessions.availability.noBlockedDates')}
              description={t('sessions.availability.noBlockedDatesDescription')}
            />
          </View>
        }
        renderItem={({ item }: { item: CoachingBlockedSlot }) => (
          <ZCard>
            <View className="flex-row items-start gap-3">
              <ZIconTile
                icon={<ZSymbol name="calendar-off" label={t('sessions.availability.blockedDates')} size={18} color={colors.text} />}
                tone="neutral"
                size="sm"
              />
              <View className="min-w-0 flex-1">
                <Text className="font-semibold text-z-text">{formatDate(item.blocked_date)}</Text>
                {item.start_time && item.end_time ? (
                  <Text className="mt-1 text-sm text-z-muted">
                    {`${item.start_time} – ${item.end_time}`}
                  </Text>
                ) : (
                  <Text className="mt-1 text-sm text-z-muted">
                    {t('common.labels.fullDay')}
                  </Text>
                )}
                {item.reason ? (
                  <Text className="mt-1 text-sm text-z-muted">{item.reason}</Text>
                ) : null}
              </View>
              <ZIconButton
                label={t('common.actions.delete')}
                variant="secondary"
                size="sm"
                onPress={() => setDeleteTarget({ kind: 'blocked', id: item.id })}
              >
                <ZSymbol name="trash" label={t('common.actions.delete')} size={16} color={colors.danger} />
              </ZIconButton>
            </View>
          </ZCard>
        )}
      />
    );
  }

  let sectionContent: React.ReactNode;
  if (section === 'session-types') {
    sectionContent = renderSessionTypes();
  } else if (section === 'schedule') {
    sectionContent = renderSchedule();
  } else {
    sectionContent = renderBlocked();
  }

  return (
    <ZScreen edges={['bottom']}>
      {/* Native header title is set once, here in the data-loaded render path. */}
      <Stack.Screen options={{ title: t('sessions.availability.manageTitle') }} />
      <ZKeyboardAvoidingView>
        {/* form/wizard summary card */}
        <ZCard className="m-4 gap-1">
          <Text className="text-2xl font-semibold text-z-text">
            {t('sessions.availability.title')}
          </Text>
          <Text className="text-sm leading-6 text-z-muted">
            {t('sessions.availability.summary')}
          </Text>
        </ZCard>

        {/* For multi-group experts, a group-change selector is shown once a
            group has been selected (the first selection goes through the early-
            return group-prompt above; this lets them switch after). */}
        {groups.length > 1 ? (
          <View className="mx-4 mb-2 gap-1">
            <ZFieldLabel label={t('common.fields.group')} />
            <ZSelect
              testID="availability-group-select"
              value={groupId}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
              placeholder={t('sessions.book.selectGroup')}
              accessibilityLabel={t('common.fields.group')}
              onValueChange={setSelectedGroupId}
            />
          </View>
        ) : null}

        <View className="px-4">
          <ZTabs
            testID="availability-tabs"
            tabs={tabs}
            activeId={section}
            onChange={(id) => setSection(id as Section)}
          />
        </View>

        {sectionContent}
      </ZKeyboardAvoidingView>

      {/* Session-type add/edit sheet */}
      {typeSheet !== null ? (
        <SessionTypeSheet
          editing={typeSheet.editing}
          groupId={groupId}
          onClose={() => setTypeSheet(null)}
        />
      ) : null}

      {/* Availability add/edit sheet */}
      {availSheet !== null ? (
        <AvailabilitySheet
          editing={availSheet.editing}
          groupId={groupId}
          dayOptions={dayOptions}
          onClose={() => setAvailSheet(null)}
        />
      ) : null}

      {/* Blocked-date add sheet */}
      {blockedSheet ? (
        <BlockedSheet groupId={groupId} onClose={() => setBlockedSheet(false)} />
      ) : null}

      {/* Delete confirm dialog (single, switched on deleteTarget.kind) */}
      <ZConfirmDialog
        visible={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'type'
            ? t('sessions.availability.deleteSessionType')
            : deleteTarget?.kind === 'avail'
              ? t('sessions.availability.deleteAvailability')
              : t('sessions.availability.deleteBlockedDate')
        }
        description={t('sessions.availability.confirmDelete')}
        tone="danger"
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={
          deactivateType.isPending || deleteAvail.isPending || deleteBlocked.isPending
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </ZScreen>
  );
}
