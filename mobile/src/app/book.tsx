import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import {
  BookingError,
  useCoachingExpertsQuery,
  useCreateBookingMutation,
  useSessionTypesQuery,
  useSlotsQuery,
} from '../api/queries/coaching';
import { queryClient } from '../api/query-client';
import { useGroupsQuery } from '../api/queries/groups';
import type { Group } from '../api/queries/groups';
import { addSessionToCalendar } from '../lib/add-to-calendar';
import { avatarSrc, initialsFromName } from '../lib/avatar';
import { SheetHeader } from '../components/sheet-header';
import { ZAvatar } from '../components/ui/z-avatar';
import { ZBadge } from '../components/ui/z-badge';
import { ZBookingBar } from '../components/ui/z-booking-bar';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZDateRail } from '../components/ui/z-date-rail';
import type { ZDateRailDay } from '../components/ui/z-date-rail';
import { ZDivider } from '../components/ui/z-divider';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZIconTile } from '../components/ui/z-icon-tile';
import { ZListItem } from '../components/ui/z-list-item';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZStepper } from '../components/ui/z-stepper';
import type { ZStep } from '../components/ui/z-stepper';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZTextarea } from '../components/ui/z-textarea';
import { ZTimeGrid } from '../components/ui/z-time-grid';
import type { ZTimeGridSlot } from '../components/ui/z-time-grid';
import { useRoleColors } from '../theme/native';

type StageId = 'group' | 'expert' | 'type' | 'time' | 'confirm';

/**
 * Confirm-step summary row (UI-kit handoff "Stimmt das so?"): leading
 * avatar/icon-tile · UPPERCASE label · value · optional sub. Composed from
 * primitives + role-token text; three of these stacked in a ZCard with dividers.
 */
function ConfirmRow({
  leading,
  label,
  value,
  sub,
}: {
  leading: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      {leading}
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-z-muted">{label}</Text>
        <Text className="mt-0.5 text-[15px] font-bold text-z-text">{value}</Text>
        {sub ? <Text className="mt-0.5 text-[13px] text-z-muted">{sub}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Stepped coaching booking flow (UI-kit handoff "Session buchen").
 *
 * One decision per step: [Group → only if >1] Expert → Type → Time → Confirm.
 * A navigable ZStepper tracks progress and allows jumping back to reached steps;
 * a persistent ZBookingBar carries the single CTA (Next → Book). Group is
 * auto-selected (and the step skipped) when exactly one group exists.
 *
 * Schema reality (no price/icon on SessionType; no rating on CoachingExpert):
 * the summary headline is the session DURATION, type rows use one generic glyph,
 * and expert rows show avatar + name only.
 */
export default function BookScreen() {
  const { t, i18n } = useTranslation();
  const { color } = useRoleColors();
  const router = useRouter();

  // ── selection + flow state ──────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [expertId, setExpertId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [dayKey, setDayKey] = useState('');
  const [slot, setSlot] = useState<CoachingSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  // ── queries ───────────────────────────────────────────────────────────────
  const groupsQuery = useGroupsQuery();
  const groups: Group[] = groupsQuery.data ?? [];
  const groupId = groups.length === 1 ? groups[0].id : selectedGroupId;
  const hasGroupStage = groups.length > 1;

  const expertsQuery = useCoachingExpertsQuery(groupId);
  const sessionTypesQuery = useSessionTypesQuery(groupId);
  const slotsQuery = useSlotsQuery(groupId, expertId, sessionTypeId);
  const { mutateAsync, isPending: isSubmitting } = useCreateBookingMutation(groupId);

  // ── derived data ─────────────────────────────────────────────────────────
  const experts: CoachingExpert[] = expertsQuery.data ?? [];
  const allSessionTypes: SessionType[] = sessionTypesQuery.data ?? [];
  const sessionTypes = expertId
    ? allSessionTypes.filter((st) => st.expert_id === expertId)
    : [];
  const slots: CoachingSlot[] = slotsQuery.data ?? [];

  const selectedExpert = experts.find((e) => e.expert_id === expertId) ?? null;
  const selectedSessionType = sessionTypes.find((st) => st.id === sessionTypeId) ?? null;

  // ── stages ─────────────────────────────────────────────────────────────────
  const stages: StageId[] = hasGroupStage
    ? ['group', 'expert', 'type', 'time', 'confirm']
    : ['expert', 'type', 'time', 'confirm'];
  const stageId = stages[Math.min(step, stages.length - 1)];
  const stageIndex = (id: StageId) => stages.indexOf(id);

  // ── slots → days / grid ──────────────────────────────────────────────────
  const slotsByDay = slots.reduce<Map<string, CoachingSlot[]>>((acc, s) => {
    const key = new Date(s.starts_at).toDateString();
    acc.set(key, [...(acc.get(key) ?? []), s]);
    return acc;
  }, new Map());

  const todayKey = new Date().toDateString();
  const railDays: ZDateRailDay[] = Array.from(slotsByDay.keys()).map((key) => {
    const d = new Date(key);
    return {
      key,
      label: key === todayKey ? t('common.labels.today') : d.toLocaleDateString(i18n.language, { weekday: 'short' }),
      day: String(d.getDate()),
      month: d.toLocaleDateString(i18n.language, { month: 'short' }),
      isToday: key === todayKey,
    };
  });

  // Preselect the first available day — the "select a date" placeholder cost
  // every booking one extra tap without a real decision. Derived (not an
  // effect): until the user taps a pill, the first day with slots is selected.
  const firstDayKey = slots.length > 0 ? new Date(slots[0].starts_at).toDateString() : '';
  const effectiveDayKey = dayKey !== '' && slotsByDay.has(dayKey) ? dayKey : firstDayKey;

  const daySlots = slotsByDay.get(effectiveDayKey) ?? [];
  const gridSlots: ZTimeGridSlot[] = daySlots.map((s) => ({
    startsAt: s.starts_at,
    label: formatTime(s.starts_at),
  }));

  // ── helpers ─────────────────────────────────────────────────────────────
  // App language (i18n.language), not device locale — a German UI must not
  // render "Thu, Jul 2" because the device is set to en-US.
  function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(i18n.language, { timeStyle: 'short' });
  }
  function formatRange(s: CoachingSlot): string {
    return `${formatTime(s.starts_at)} – ${formatTime(s.ends_at)}`;
  }

  // ── stepper ─────────────────────────────────────────────────────────────
  const stepLabels: Record<StageId, string> = {
    group: t('sessions.book.selectGroup'),
    expert: t('sessions.book.selectExpert'),
    type: t('sessions.book.sessionType'),
    time: t('sessions.book.selectTime'),
    confirm: t('common.actions.confirm'),
  };
  const stepperSteps: ZStep[] = stages.map((id, index) => ({
    label: stepLabels[id],
    state: index < step ? 'completed' : index === step ? 'active' : 'upcoming',
  }));

  function goStep(n: number) {
    const clamped = Math.max(0, Math.min(n, stages.length - 1));
    setStep(clamped);
    setReached((r) => Math.max(r, clamped));
  }
  function onStepPress(index: number) {
    if (index <= reached) setStep(index);
  }

  // ── selection handlers (reset cascade + clamp reached) ───────────────────
  function handleSelectGroup(id: string) {
    if (id === selectedGroupId) return;
    setSelectedGroupId(id);
    setExpertId('');
    setSessionTypeId('');
    setDayKey('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
    setReached(stageIndex('group'));
  }
  function handleSelectExpert(id: string) {
    setExpertId(id === expertId ? '' : id);
    setSessionTypeId('');
    setDayKey('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
    setReached(stageIndex('expert'));
  }
  function handleSelectType(id: string) {
    setSessionTypeId(id === sessionTypeId ? '' : id);
    setDayKey('');
    setSlot(null);
    setSubmitError(null);
    setReached(stageIndex('type'));
  }
  function handleSelectDay(key: string) {
    setDayKey(key);
    setSlot(null);
  }
  function handleSelectSlot(startsAt: string) {
    setSlot(daySlots.find((s) => s.starts_at === startsAt) ?? null);
  }

  // ── CTA gating ────────────────────────────────────────────────────────────
  const stageReady: Record<StageId, boolean> = {
    group: groupId !== '',
    expert: expertId !== '',
    type: sessionTypeId !== '',
    time: slot !== null,
    confirm: true,
  };
  const isConfirm = stageId === 'confirm';
  const canAdvance = stageReady[stageId];
  const ctaLabel = isConfirm ? t('sessions.book.bookSession') : t('common.actions.next');

  function handleCta() {
    if (isConfirm) void handleSubmit();
    else goStep(step + 1);
  }

  async function handleSubmit() {
    if (!expertId || !sessionTypeId || !slot) return;
    // Clear any prior failure so a retry starts clean (no stale banner).
    setSubmitError(null);
    try {
      await mutateAsync({
        expertId,
        sessionTypeId,
        scheduledAt: slot.starts_at,
        notes: notes.trim() || undefined,
      });
      setBooked(true);
    } catch (err) {
      if (err instanceof BookingError && err.status === 409) {
        // Slot taken: drop it, refetch availability, and send the user back to
        // the time step to re-pick — otherwise the confirm CTA stays enabled but
        // would silently no-op (no slot selected).
        setSlot(null);
        void queryClient.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
        setSubmitError(t('sessions.book.slotTaken'));
        goStep(stageIndex('time'));
      } else if (err instanceof BookingError && err.status === 400) {
        setSubmitError(t('sessions.book.tooLate'));
      } else {
        setSubmitError(t('sessions.book.failed'));
      }
    }
  }

  // ── booking-bar summary ─────────────────────────────────────────────────
  const headline = selectedSessionType
    ? t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })
    : undefined;
  const context = [
    selectedSessionType?.name,
    selectedExpert ? `${selectedExpert.first_name} ${selectedExpert.last_name}`.trim() : null,
    slot ? formatTime(slot.starts_at) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const hint = headline ? undefined : stepLabels[stageId];

  // ── stage body ────────────────────────────────────────────────────────────
  // Per-step selection lists (group/expert/type) use `.map()` rather than
  // FlatList by design: each is a short, bounded set (a group's experts, an
  // expert's session types) and only one is visible per step inside the shared
  // ScrollView. A same-axis nested FlatList would emit RN's "VirtualizedLists
  // should never be nested" warning, and `scrollEnabled={false}` to silence it
  // removes all virtualization benefit — so FlatList here would be pure ceremony.
  function renderStage() {
    switch (stageId) {
      case 'group':
        return (
          <View className="gap-2">
            <Text className="text-[19px] font-extrabold text-z-text">{t('sessions.book.selectGroup')}</Text>
            {groups.map((g) => (
              <ZListItem
                key={g.id}
                testID={`book-group-${g.id}`}
                title={g.name}
                selected={groupId === g.id}
                onPress={() => handleSelectGroup(g.id)}
              />
            ))}
          </View>
        );
      case 'expert':
        return (
          <View className="gap-2">
            <Text className="text-[19px] font-extrabold text-z-text">{t('sessions.book.selectExpert')}</Text>
            {expertsQuery.isPending ? (
              <View className="gap-2">
                <ZSkeleton className="h-16 w-full rounded-2xl" />
                <ZSkeleton className="h-16 w-full rounded-2xl" />
              </View>
            ) : expertsQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadExpertsFailed')}
                onRetry={() => void expertsQuery.refetch()}
                testID="book-experts-retry"
              />
            ) : experts.length === 0 ? (
              <ZEmptyState title={t('sessions.book.noExperts')} description={t('sessions.book.noExpertsDescription')} />
            ) : (
              experts.map((e) => {
                const name = `${e.first_name} ${e.last_name}`.trim();
                return (
                  <ZListItem
                    key={e.expert_id}
                    testID={`book-expert-${e.expert_id}`}
                    leading={
                      <ZAvatar
                        size={44}
                        shape="circle"
                        image={e.avatar ? avatarSrc(e.avatar) : undefined}
                        fallback={initialsFromName(name)}
                        alt={name}
                      />
                    }
                    title={name}
                    selected={expertId === e.expert_id}
                    onPress={() => handleSelectExpert(e.expert_id)}
                  />
                );
              })
            )}
          </View>
        );
      case 'type':
        return (
          <View className="gap-2">
            <Text className="text-[19px] font-extrabold text-z-text">{t('sessions.book.sessionType')}</Text>
            {sessionTypesQuery.isPending ? (
              <View className="gap-2">
                <ZSkeleton className="h-20 w-full rounded-2xl" />
                <ZSkeleton className="h-20 w-full rounded-2xl" />
              </View>
            ) : sessionTypesQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadSessionTypesFailed')}
                onRetry={() => void sessionTypesQuery.refetch()}
                testID="book-types-retry"
              />
            ) : sessionTypes.length === 0 ? (
              <ZEmptyState
                title={t('sessions.book.noSessionTypes')}
                description={t('sessions.book.noSessionTypesDescription')}
              />
            ) : (
              sessionTypes.map((st) => (
                <ZListItem
                  key={st.id}
                  testID={`book-type-${st.id}`}
                  leading={
                    <ZIconTile
                      tone={sessionTypeId === st.id ? 'primary' : 'neutral'}
                      icon={<ZSymbol name="video" label={st.name} size={20} color={color('accent')} />}
                    />
                  }
                  title={st.name}
                  titleAccessory={<ZBadge label={t('common.labels.minutesShort', { count: st.duration_minutes })} />}
                  subtitle={st.description}
                  selected={sessionTypeId === st.id}
                  onPress={() => handleSelectType(st.id)}
                />
              ))
            )}
          </View>
        );
      case 'time':
        return (
          <View className="gap-3">
            <Text className="text-[19px] font-extrabold text-z-text">{t('sessions.book.selectTime')}</Text>
            {slotsQuery.isPending ? (
              <View className="gap-3">
                <ZSkeleton className="h-16 w-full rounded-2xl" />
                <ZSkeleton className="h-24 w-full rounded-2xl" />
              </View>
            ) : slotsQuery.isError ? (
              <ZQueryError
                title={t('sessions.book.loadSlotsFailed')}
                onRetry={() => void slotsQuery.refetch()}
                testID="book-slots-retry"
              />
            ) : slots.length === 0 ? (
              <ZEmptyState title={t('sessions.book.noTimes')} description={t('sessions.book.noTimesDescription')} />
            ) : (
              <>
                <ZDateRail days={railDays} selectedKey={effectiveDayKey} onSelect={handleSelectDay} testID="book-daterail" />
                {effectiveDayKey === '' ? (
                  <Text className="text-[15px] text-z-muted">{t('sessions.book.selectDate')}</Text>
                ) : (
                  <ZTimeGrid
                    slots={gridSlots}
                    selectedStartsAt={slot?.starts_at ?? ''}
                    onSelect={handleSelectSlot}
                    hint={
                      selectedSessionType
                        ? t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })
                        : undefined
                    }
                    testID="book-time"
                  />
                )}
              </>
            )}
          </View>
        );
      case 'confirm': {
        const confirmExpertName = selectedExpert
          ? `${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()
          : '';
        return (
          <View className="gap-4">
            <Text className="text-[19px] font-extrabold text-z-text">{t('common.actions.confirm')}</Text>
            {selectedExpert && selectedSessionType && slot ? (
              <ZCard className="w-full">
                {/* Three labeled summary rows (Session · Expert · Date) per the
                    handoff "Stimmt das so?" card. Inner View owns the column so
                    ZCard's outer-wrapper className split (Android) doesn't break it. */}
                <View>
                  <ConfirmRow
                    leading={
                      <ZIconTile
                        size="sm"
                        icon={<ZSymbol name="video" label={t('sessions.book.sessionType')} size={18} color={color('accent')} />}
                      />
                    }
                    label={t('sessions.book.sessionType')}
                    value={`${selectedSessionType.name} · ${t('common.labels.minutesShort', {
                      count: selectedSessionType.duration_minutes,
                    })}`}
                  />
                  <ZDivider />
                  <ConfirmRow
                    leading={
                      <ZAvatar
                        size={38}
                        shape="circle"
                        image={selectedExpert.avatar ? avatarSrc(selectedExpert.avatar) : undefined}
                        fallback={initialsFromName(confirmExpertName)}
                        alt={confirmExpertName}
                      />
                    }
                    label={t('common.labels.expert')}
                    value={confirmExpertName}
                  />
                  <ZDivider />
                  <ConfirmRow
                    leading={
                      <ZIconTile
                        size="sm"
                        icon={<ZSymbol name="calendar" label={t('sessions.book.dateTime')} size={18} color={color('accent')} />}
                      />
                    }
                    label={t('sessions.book.dateTime')}
                    value={formatDay(slot.starts_at)}
                    sub={`${formatRange(slot)} · ${t('common.labels.yourLocalTime')}`}
                  />
                </View>
              </ZCard>
            ) : null}
            <View>
              <Text className="mb-2 text-[15px] font-bold text-z-text">{t('sessions.book.notes')}</Text>
              <ZTextarea
                testID="book-notes"
                value={notes}
                onChangeText={setNotes}
                accessibilityLabel={t('sessions.book.notes')}
                placeholder={t('sessions.book.notesPlaceholder')}
                rows={3}
              />
            </View>
          </View>
        );
      }
      default:
        return null;
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <ZScreen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('sessions.bookLive'),
          headerLeft: () => (
            <ZButton
              testID="book-cancel"
              label={t('common.actions.cancel')}
              variant="ghost"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      {/* Android renders no formSheet header — this in-content header carries
          the title + close there; iOS keeps the native one (see SheetHeader). */}
      <SheetHeader title={t('sessions.bookLive')} onClose={() => router.back()} testID="book-sheet-header" />

      {booked ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }}>
          <View testID="book-success" className="items-center gap-4">
            {/* Inline width/height/radius: NativeWind arbitrary classes
                (h-16 w-16 rounded-[22px]) mis-rendered on Android as a tall
                rect with only top corners rounded; inline style is authoritative. */}
            <View
              className="items-center justify-center bg-z-success-soft"
              style={{ width: 64, height: 64, borderRadius: 20 }}
            >
              <ZSymbol name="check" label={t('sessions.book.bookedHeading')} size={30} color={color('success')} />
            </View>
            <Text className="text-center text-[22px] font-extrabold tracking-tight text-z-text">
              {t('sessions.book.bookedHeading')}
            </Text>
            <Text className="max-w-md text-center text-[15px] leading-6 text-z-muted">
              {t('sessions.book.bookedDescription')}
            </Text>
            {selectedExpert && selectedSessionType && slot ? (
              <ZCard className="w-full">
                {/* Inner flex-row View, not flex-row on ZCard: on Android ZCard
                    applies className to an OUTER wrapper, so flex-* there lays
                    out the wrapper (one child), not the card contents → the
                    badge would wrap below. Mirror the confirm card's pattern. */}
                <View className="flex-row items-center gap-3">
                  <ZAvatar
                    size={44}
                    shape="circle"
                    image={selectedExpert.avatar ? avatarSrc(selectedExpert.avatar) : undefined}
                    fallback={initialsFromName(`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim())}
                    alt={`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()}
                  />
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-z-text">{selectedSessionType.name}</Text>
                    <Text className="text-[15px] text-z-muted">{`${formatDay(slot.starts_at)} · ${formatTime(slot.starts_at)}`}</Text>
                  </View>
                  <ZBadge
                    label={t('common.labels.minutesShort', { count: selectedSessionType.duration_minutes })}
                    tone="primary"
                  />
                </View>
              </ZCard>
            ) : null}
            {/* Full-width stacked CTAs (handoff): secondary "add to calendar" + primary "Done". */}
            <View className="w-full gap-2 pt-1">
              {selectedSessionType && slot ? (
                <ZButton
                  testID="book-add-calendar"
                  variant="secondary"
                  fullWidth
                  label={t('sessions.book.addToCalendar')}
                  onPress={() =>
                    void addSessionToCalendar({
                      title: selectedSessionType.name,
                      startsAt: slot.starts_at,
                      endsAt: slot.ends_at,
                      notes: notes.trim() || undefined,
                    })
                  }
                />
              ) : null}
              <ZButton
                testID="book-view-sessions"
                fullWidth
                label={t('common.actions.done')}
                onPress={() => router.replace('/coaching')}
              />
            </View>
          </View>
        </ScrollView>
      ) : groupsQuery.isPending ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <ZSkeleton className="h-8 w-full rounded-full" />
          <ZSkeleton className="h-16 w-full rounded-2xl" />
          <ZSkeleton className="h-16 w-full rounded-2xl" />
        </ScrollView>
      ) : groupsQuery.isError ? (
        <View className="flex-1 p-4">
          <ZQueryError title={t('home.error.title')} onRetry={() => void groupsQuery.refetch()} testID="book-groups-retry" />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 justify-center p-4">
          <ZEmptyState title={t('groups.noGroupsYet')} description={t('groups.noGroupsJoined')} />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 20 }}
          >
            <ZStepper steps={stepperSteps} reached={reached} onStepPress={onStepPress} testID="book-stepper" />
            {renderStage()}
            {submitError !== null ? (
              <Text testID="book-error" className="text-sm text-z-danger">
                {submitError}
              </Text>
            ) : null}
          </ScrollView>
          <ZBookingBar
            testID="book-bar"
            headline={headline}
            hint={hint}
            context={context}
            ctaLabel={ctaLabel}
            ctaDisabled={!canAdvance}
            ctaLoading={isSubmitting}
            onPress={handleCta}
          />
        </>
      )}
    </ZScreen>
  );
}
