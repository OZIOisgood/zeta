import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { CoachingBlockedSlot } from '../api/queries/coaching';
import {
  useBlockedSlotsQuery,
  useDeactivateSessionTypeMutation,
  useDeleteAvailabilityMutation,
  useDeleteBlockedSlotMutation,
  useMyAvailabilityQuery,
  useSessionTypesQuery,
} from '../api/queries/coaching';
import { useGroupsQuery } from '../api/queries/groups';
import { useAuth } from '../auth/auth-store';
import { formatDate } from '../lib/datetime';
import { ScheduleDayRow } from '../components/schedule-day-row';
import { SessionTypeRow } from '../components/session-type-row';
import { ZButton } from '../components/ui/z-button';
import { ZGroupedList } from '../components/ui/z-grouped-list';
import { ZConfirmDialog } from '../components/ui/z-confirm-dialog';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZIconTile } from '../components/ui/z-icon-tile';
import { ZListItem } from '../components/ui/z-list-item';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect } from '../components/ui/z-select';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTabs } from '../components/ui/z-tabs';
import { showToast } from '../components/ui/z-toast';
import { Touchable } from '../components/ui/touchable';
import { useRoleColors } from '../theme/native';

type Section = 'session-types' | 'schedule' | 'blocked';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPaddingBottom = Platform.OS === 'android' ? 96 : 24;
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

  // ── dialog state (the add/edit forms are formSheet ROUTES — see
  // availability-session-type / availability-slot / availability-blocked) ─────
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'type'; id: string }
    | { kind: 'avail'; id: string }
    | { kind: 'blocked'; id: string }
    | null
  >(null);

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
      showToast(t('toast.successTitle'), t('sessions.availability.deletedEntry'), 'success');
    } catch {
      setDeleteTarget(null);
      showToast(t('toast.errorTitle'), t('sessions.availability.deleteFailed'), 'error');
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
          {/* No intro card — the native header (title set above) carries the
              title, matching the handoff (the intro card was removed). */}
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
    { id: 'session-types', label: t('sessions.availability.sessionTypesShort') },
    { id: 'schedule', label: t('sessions.availability.weeklyScheduleShort') },
    { id: 'blocked', label: t('sessions.availability.blockedDatesShort') },
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
    const data = typesQuery.data ?? [];
    if (data.length === 0) {
      return (
        <View testID="availability-empty-session-types" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noSessionTypes')}
            description={t('sessions.availability.noSessionTypesDescription')}
          >
            <ZButton
              label={t('sessions.availability.addSessionType')}
              onPress={() => router.push({ pathname: '/availability-session-type', params: { groupId } })}
            />
          </ZEmptyState>
        </View>
      );
    }
    // Grouped inset-list (virtualized FlatList): one surface card, hairline
    // dividers between consecutive rows.
    return (
      <ZGroupedList
        scroll
        data={data}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ marginBottom: listPaddingBottom }}
        renderItem={(item) => (
          <SessionTypeRow
            sessionType={item}
            durationLabel={t('common.labels.minutesShort', { count: item.duration_minutes })}
            editLabel={t('common.actions.edit')}
            deleteLabel={t('common.actions.delete')}
            onEdit={() =>
              router.push({
                pathname: '/availability-session-type',
                params: { groupId, sessionTypeId: item.id },
              })
            }
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
    const data = availabilityQuery.data ?? [];
    if (data.length === 0) {
      return (
        <View testID="availability-empty-schedule" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noAvailability')}
            description={t('sessions.availability.noAvailabilityDescription')}
          >
            <ZButton
              label={t('sessions.availability.addAvailability')}
              onPress={() => router.push({ pathname: '/availability-slot', params: { groupId } })}
            />
          </ZEmptyState>
        </View>
      );
    }
    // Grouped inset-list (virtualized FlatList): one surface card, hairline
    // dividers between consecutive rows.
    return (
      <ZGroupedList
        scroll
        data={data}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ marginBottom: listPaddingBottom }}
        renderItem={(item) => (
          <ScheduleDayRow
            availability={item}
            dayName={t(`weekdays.${item.day_of_week}`)}
            editLabel={t('common.actions.edit')}
            deleteLabel={t('common.actions.delete')}
            onEdit={() =>
              router.push({
                pathname: '/availability-slot',
                params: { groupId, availabilityId: item.id },
              })
            }
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
    const data = blockedQuery.data ?? [];
    if (data.length === 0) {
      return (
        <View testID="availability-empty-blocked" className="p-4">
          <ZEmptyState
            title={t('sessions.availability.noBlockedDates')}
            description={t('sessions.availability.noBlockedDatesDescription')}
          >
            <ZButton
              label={t('sessions.availability.addBlockTime')}
              onPress={() => router.push({ pathname: '/availability-blocked', params: { groupId } })}
            />
          </ZEmptyState>
        </View>
      );
    }
    // Grouped inset-list (virtualized FlatList): one surface card, hairline
    // dividers between consecutive rows.
    return (
      <ZGroupedList
        scroll
        data={data as CoachingBlockedSlot[]}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ marginBottom: listPaddingBottom }}
        renderItem={(item) => {
          // Time-range vs full-day on the first subtitle line; the optional
          // reason follows on a second line (ZListItem subtitle allows 3 lines).
          const timeline =
            item.start_time && item.end_time
              ? `${item.start_time} – ${item.end_time}`
              : t('common.labels.fullDay');
          const subtitle = item.reason ? `${timeline}\n${item.reason}` : timeline;
          return (
            <ZListItem
              // Non-interactive: the row surfaces its own delete control.
              leading={
                <ZIconTile
                  icon={<ZSymbol name="calendar-off" label={t('sessions.availability.blockedDates')} size={18} color={color('onSurface')} />}
                  tone="neutral"
                  size="sm"
                />
              }
              title={formatDate(item.blocked_date)}
              subtitle={subtitle}
              trailing={
                <ZIconButton
                  label={t('common.actions.delete')}
                  variant="secondary"
                  size="sm"
                  onPress={() => setDeleteTarget({ kind: 'blocked', id: item.id })}
                >
                  <ZSymbol name="trash" label={t('common.actions.delete')} size={16} color={color('danger')} />
                </ZIconButton>
              }
            />
          );
        }}
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

  // Active-section create action — surfaced as the iOS nav-bar "+" (header-right)
  // and the Android Material FAB. Both push the section's formSheet route.
  function handleAdd() {
    const pathname =
      section === 'session-types'
        ? '/availability-session-type'
        : section === 'schedule'
          ? '/availability-slot'
          : '/availability-blocked';
    router.push({ pathname, params: { groupId } });
  }
  const addLabel =
    section === 'session-types'
      ? t('sessions.availability.addSessionType')
      : section === 'schedule'
        ? t('sessions.availability.addAvailability')
        : t('sessions.availability.addBlockTime');

  return (
    <ZScreen edges={['bottom']}>
      {/* Native header title is set once, here in the data-loaded render path.
          iOS surfaces the active section's create action as a nav-bar "+";
          Android uses the Material FAB rendered below. */}
      <Stack.Screen
        options={{
          title: t('sessions.availability.manageTitle'),
          headerRight:
            Platform.OS === 'ios'
              ? () => (
                  <Touchable
                    testID="availability-create-header-btn"
                    accessibilityLabel={addLabel}
                    onPress={handleAdd}
                    haptic
                  >
                    <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={color('accent')} />
                  </Touchable>
                )
              : undefined,
        }}
      />
      <ZKeyboardAvoidingView>
        {/* No in-content title/summary card — the native large-title header
            (title set above) carries the screen title, matching the handoff
            (the prototype removed the intro card; sections are a grouped list). */}
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

      {/* Android: Material FAB for the active section's create action.
          iOS surfaces the same action via the native header-right "+" set above. */}
      {Platform.OS === 'android' ? (
        <View className="absolute right-6" style={{ bottom: insets.bottom + 16 }}>
          <ZIconButton
            testID="availability-create-fab"
            label={addLabel}
            variant="primary"
            size="lg"
            shape="circle"
            onPress={handleAdd}
          >
            <ZSymbol name="plus" label={t('common.actions.add')} size={24} color={color('onAccent')} />
          </ZIconButton>
        </View>
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
