import { useState } from 'react';
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
import { Touchable } from '../components/ui/touchable';
import { ZBadge } from '../components/ui/z-badge';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZChip } from '../components/ui/z-chip';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZQueryError } from '../components/ui/z-query-error';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZStepper } from '../components/ui/z-stepper';
import type { ZStep } from '../components/ui/z-stepper';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZTextarea } from '../components/ui/z-textarea';
import { showToast } from '../components/ui/z-toast';
import { colors } from '../theme/colors';

/**
 * Guided coaching booking flow.
 *
 * Layout decision: **all sections expanded** (no collapsing). Each section
 * becomes visible once the prerequisite above it is satisfied, while the
 * <ZStepper> at the top reflects progress through the web 5-step flow
 * (select group / expert / session type / time / confirm) derived from the
 * current selection state.
 *
 * Auto-select: when exactly one group is available, it is selected in the
 * render phase (derived state) rather than via useEffect to avoid the
 * extra render cycle.
 */
export default function BookScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── selection state ────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [expertId, setExpertId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [slot, setSlot] = useState<CoachingSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  // ── queries ────────────────────────────────────────────────────────────────
  const groupsQuery = useGroupsQuery();

  // Auto-select single group: derive in render — no useEffect needed.
  const groups: Group[] = groupsQuery.data ?? [];
  const groupId = groups.length === 1 ? groups[0].id : selectedGroupId;

  const expertsQuery = useCoachingExpertsQuery(groupId);
  const sessionTypesQuery = useSessionTypesQuery(groupId);
  const slotsQuery = useSlotsQuery(groupId, expertId, sessionTypeId);
  const { mutateAsync, isPending: isSubmitting } = useCreateBookingMutation(groupId);

  // ── derived data ───────────────────────────────────────────────────────────
  const experts: CoachingExpert[] = expertsQuery.data ?? [];

  // Session types filtered to the selected expert (expert_id scoping)
  // Session types are an expert's offering (coaching_session_types.expert_id),
  // so we scope them to the selected expert. The web booking flow currently
  // shows all active types in the group — candidate web bug, tracked as follow-up.
  const allSessionTypes: SessionType[] = sessionTypesQuery.data ?? [];
  const sessionTypes = expertId
    ? allSessionTypes.filter((st) => st.expert_id === expertId)
    : [];

  const slots: CoachingSlot[] = slotsQuery.data ?? [];

  // Group slots by day using toDateString as key
  const slotsByDay = slots.reduce<Map<string, CoachingSlot[]>>((acc, s) => {
    const key = new Date(s.starts_at).toDateString();
    acc.set(key, [...(acc.get(key) ?? []), s]);
    return acc;
  }, new Map());

  const selectedExpert = experts.find((e) => e.expert_id === expertId) ?? null;
  const selectedSessionType = sessionTypes.find((st) => st.id === sessionTypeId) ?? null;

  // ── stepper (web 5-step flow, derived from selection state) ─────────────────
  const activeStep = slot
    ? 4
    : sessionTypeId
      ? 3
      : expertId
        ? 2
        : groupId
          ? 1
          : 0;

  const stepLabels = [
    t('sessions.book.selectGroup'),
    t('sessions.book.selectExpert'),
    t('sessions.book.sessionType'),
    t('sessions.book.selectTime'),
    t('common.actions.confirm'),
  ];
  const stepperSteps: ZStep[] = stepLabels.map((label, index) => ({
    label,
    state: index < activeStep ? 'completed' : index === activeStep ? 'active' : 'upcoming',
  }));

  const stepDescriptions = [
    t('sessions.book.selectGroupDescription'),
    t('sessions.book.selectExpertDescription'),
    t('sessions.book.sessionTypeDescription'),
    t('sessions.book.selectSlotDescription'),
    t('sessions.book.confirmDescription'),
  ];

  // ── helpers ──────────────────────────────────────────────────────────────
  function formatDay(isoString: string): string {
    return new Date(isoString).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], { timeStyle: 'short' });
  }

  function formatRange(s: CoachingSlot): string {
    return `${formatTime(s.starts_at)} – ${formatTime(s.ends_at)}`;
  }

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleSelectGroup(id: string) {
    if (id === selectedGroupId) return;
    setSelectedGroupId(id);
    setExpertId('');
    setSessionTypeId('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
  }

  function handleSelectExpert(id: string) {
    if (id === expertId) {
      setExpertId('');
      setSessionTypeId('');
      setSlot(null);
      setNotes('');
      setSubmitError(null);
      return;
    }
    setExpertId(id);
    setSessionTypeId('');
    setSlot(null);
    setNotes('');
    setSubmitError(null);
  }

  function handleSelectSessionType(id: string) {
    if (id === sessionTypeId) {
      setSessionTypeId('');
      setSlot(null);
      setNotes('');
      return;
    }
    setSessionTypeId(id);
    setSlot(null);
    setNotes('');
  }

  function handleSelectSlot(s: CoachingSlot) {
    setSlot(s);
  }

  async function handleSubmit() {
    if (!expertId || !sessionTypeId || !slot) return;
    try {
      await mutateAsync({
        expertId,
        sessionTypeId,
        scheduledAt: slot.starts_at,
        notes: notes.trim() || undefined,
      });
      setBooked(true);
      showToast(t('sessions.book.bookedHeading'), t('sessions.book.bookedDescription'), 'success');
    } catch (err) {
      if (err instanceof BookingError && err.status === 409) {
        setSlot(null);
        void queryClient.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
        setSubmitError(t('sessions.book.slotTaken'));
      } else if (err instanceof BookingError && err.status === 400) {
        setSubmitError(t('sessions.book.tooLate'));
      } else {
        setSubmitError(t('sessions.book.failed'));
      }
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <ZScreen edges={['bottom']}>
      {/* Native sheet header with title + cancel affordance. */}
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

      {booked ? (
        // ── Success state ─────────────────────────────────────────────────────
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }}
        >
          <View testID="book-success" className="items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-md bg-z-primary-soft">
              <ZSymbol name="check" label={t('sessions.book.bookedHeading')} size={24} color={colors.primary} />
            </View>
            <Text className="text-center text-xl font-semibold text-z-text">
              {t('sessions.book.bookedHeading')}
            </Text>
            <Text className="max-w-md text-center text-sm leading-6 text-z-muted">
              {t('sessions.book.bookedDescription')}
            </Text>
            <ZButton
              testID="book-view-sessions"
              label={t('sessions.book.viewSessions')}
              onPress={() => router.replace('/coaching')}
            />
          </View>
        </ScrollView>
      ) : (
        <ZKeyboardAvoidingView>
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 24 }}
          >
            {/* Progress stepper */}
            <View className="gap-3">
              <ZStepper steps={stepperSteps} testID="book-stepper" />
              <Text className="text-sm leading-6 text-z-muted">{stepDescriptions[activeStep]}</Text>
            </View>

            {/* ── Group section (hidden when exactly one group) ─────────────────── */}
            {groups.length !== 1 && (
              <ZCard>
                <Text className="mb-2 text-base font-semibold text-z-text">
                  {t('sessions.book.selectGroup')}
                </Text>
                {groupsQuery.isPending ? (
                  <View className="gap-2">
                    <ZSkeleton className="h-8 w-1/2 rounded-full" />
                    <ZSkeleton className="h-8 w-1/3 rounded-full" />
                  </View>
                ) : groupsQuery.isError ? (
                  <ZQueryError
                    title={t('home.error.title')}
                    onRetry={() => void groupsQuery.refetch()}
                    testID="book-groups-retry"
                  />
                ) : groups.length === 0 ? (
                  <ZEmptyState
                    title={t('groups.noGroupsYet')}
                    description={t('groups.noGroupsJoined')}
                  />
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {groups.map((g) => (
                      <ZChip
                        key={g.id}
                        label={g.name}
                        selected={groupId === g.id}
                        onPress={() => handleSelectGroup(g.id)}
                        testID={`book-group-${g.id}`}
                      />
                    ))}
                  </View>
                )}
              </ZCard>
            )}

            {/* ── Expert section ────────────────────────────────────────────────── */}
            {groupId !== '' && (
              <ZCard>
                <Text className="mb-2 text-base font-semibold text-z-text">
                  {t('sessions.book.selectExpert')}
                </Text>
                {expertsQuery.isPending ? (
                  <View className="flex-row gap-2">
                    <ZSkeleton className="h-8 w-24 rounded-full" />
                    <ZSkeleton className="h-8 w-24 rounded-full" />
                  </View>
                ) : expertsQuery.isError ? (
                  <ZQueryError
                    title={t('sessions.book.loadExpertsFailed')}
                    onRetry={() => void expertsQuery.refetch()}
                    testID="book-experts-retry"
                  />
                ) : experts.length === 0 ? (
                  <ZEmptyState
                    title={t('sessions.book.noExperts')}
                    description={t('sessions.book.noExpertsDescription')}
                  />
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {experts.map((e) => (
                      <ZChip
                        key={e.expert_id}
                        label={`${e.first_name} ${e.last_name}`.trim()}
                        selected={expertId === e.expert_id}
                        onPress={() => handleSelectExpert(e.expert_id)}
                        testID={`book-expert-${e.expert_id}`}
                      />
                    ))}
                  </View>
                )}
              </ZCard>
            )}

            {/* ── Session Type section ──────────────────────────────────────────── */}
            {expertId !== '' && (
              <View>
                <Text className="mb-2 text-base font-semibold text-z-text">
                  {t('sessions.book.sessionType')}
                </Text>
                {sessionTypesQuery.isPending ? (
                  <View className="gap-2">
                    <ZSkeleton className="h-20 w-full rounded-lg" />
                    <ZSkeleton className="h-20 w-full rounded-lg" />
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
                  <View className="gap-2">
                    {sessionTypes.map((st) => {
                      const isSelected = sessionTypeId === st.id;
                      return (
                        <Touchable
                          key={st.id}
                          testID={`book-type-${st.id}`}
                          accessibilityLabel={st.name}
                          selected={isSelected}
                          onPress={() => handleSelectSessionType(st.id)}
                        >
                          <ZCard className={isSelected ? 'border-z-primary bg-z-primary-soft' : ''}>
                            <View className="flex-row items-start justify-between gap-2">
                              <Text className="flex-1 font-semibold text-z-text">{st.name}</Text>
                              <ZBadge label={`${st.duration_minutes} min`} />
                            </View>
                            <Text className="mt-2 text-sm leading-6 text-z-muted">
                              {st.description}
                            </Text>
                          </ZCard>
                        </Touchable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ── Slot section ──────────────────────────────────────────────────── */}
            {groupId !== '' && expertId !== '' && sessionTypeId !== '' && (
              <ZCard>
                <Text className="mb-2 text-base font-semibold text-z-text">
                  {t('sessions.book.selectTime')}
                </Text>
                {slotsQuery.isPending ? (
                  <View className="gap-3">
                    <ZSkeleton className="h-6 w-1/3" />
                    <View className="flex-row flex-wrap gap-2">
                      <ZSkeleton className="h-8 w-20 rounded-full" />
                      <ZSkeleton className="h-8 w-20 rounded-full" />
                      <ZSkeleton className="h-8 w-20 rounded-full" />
                    </View>
                  </View>
                ) : slotsQuery.isError ? (
                  <ZQueryError
                    title={t('sessions.book.loadSlotsFailed')}
                    onRetry={() => void slotsQuery.refetch()}
                    testID="book-slots-retry"
                  />
                ) : slots.length === 0 ? (
                  <ZEmptyState
                    title={t('sessions.book.noTimes')}
                    description={t('sessions.book.noTimesDescription')}
                  />
                ) : (
                  <View className="gap-4">
                    {Array.from(slotsByDay.entries()).map(([dayKey, daySlots]) => (
                      <View key={dayKey}>
                        <Text className="mb-2 text-sm font-semibold text-z-muted">
                          {formatDay(daySlots[0].starts_at)}
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {daySlots.map((s) => (
                            <ZChip
                              key={s.starts_at}
                              label={formatRange(s)}
                              selected={slot?.starts_at === s.starts_at}
                              onPress={() => handleSelectSlot(s)}
                              testID={`book-slot-${s.starts_at}`}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ZCard>
            )}

            {/* Inline submit error — shown outside confirm section so it persists after slot reset */}
            {submitError !== null && (
              <Text testID="book-error" className="text-sm text-z-danger">
                {submitError}
              </Text>
            )}

            {/* ── Confirm section ───────────────────────────────────────────────── */}
            {slot !== null && selectedExpert !== null && selectedSessionType !== null && (
              <ZCard className="gap-3">
                <Text className="text-lg font-semibold text-z-text">
                  {t('sessions.book.confirmDescription')}
                </Text>

                {/* Summary lines */}
                <View className="gap-1">
                  <Text className="text-sm text-z-text">
                    <Text className="font-semibold">{t('sessions.book.selectExpert')}: </Text>
                    {`${selectedExpert.first_name} ${selectedExpert.last_name}`.trim()}
                  </Text>
                  <Text className="text-sm text-z-text">
                    <Text className="font-semibold">{t('sessions.book.sessionType')}: </Text>
                    {selectedSessionType.name}
                  </Text>
                  <Text className="text-sm text-z-text">
                    {formatDay(slot.starts_at)} {formatRange(slot)}
                  </Text>
                  <Text className="text-sm text-z-muted">{t('common.labels.yourLocalTime')}</Text>
                </View>

                {/* Optional notes */}
                <ZTextarea
                  testID="book-notes"
                  value={notes}
                  onChangeText={setNotes}
                  accessibilityLabel={t('sessions.book.notes')}
                  placeholder={t('sessions.book.notesPlaceholder')}
                  rows={3}
                />

                {/* Submit */}
                <ZButton
                  testID="book-submit"
                  label={isSubmitting ? t('sessions.book.booking') : t('sessions.book.bookSession')}
                  loading={isSubmitting}
                  onPress={() => void handleSubmit()}
                />

                {/* Secondary back to the slot step */}
                <ZButton
                  testID="book-back"
                  label={t('common.actions.back')}
                  variant="secondary"
                  disabled={isSubmitting}
                  onPress={() => setSlot(null)}
                />
              </ZCard>
            )}

            {/* Bottom spacer */}
            <View className="h-8" />
          </ScrollView>
        </ZKeyboardAvoidingView>
      )}
    </ZScreen>
  );
}
