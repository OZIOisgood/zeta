import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { CoachingExpert, CoachingSlot, SessionType } from '../api/queries/coaching';
import {
  useCoachingExpertsQuery,
  useCreateBookingMutation,
  useSessionTypesQuery,
  useSlotsQuery,
} from '../api/queries/coaching';
import { useGroupsQuery } from '../api/queries/groups';
import type { Group } from '../api/queries/groups';
import { ZButton } from '../components/ui/z-button';
import { ZChip } from '../components/ui/z-chip';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTextarea } from '../components/ui/z-textarea';
import { colors } from '../theme/colors';

/**
 * Guided coaching booking flow.
 *
 * Layout decision: **all sections expanded** (no collapsing). Each section
 * becomes visible once the prerequisite above it is satisfied. This is the
 * simpler approach that satisfies every test assertion.
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
      router.back();
    } catch {
      setSubmitError(t('sessions.book.failed'));
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <ZScreen>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
        <ZIconButton
          label={t('common.actions.back')}
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
        >
          <ChevronLeft color={colors.text} size={20} />
        </ZIconButton>
        <Text className="text-xl font-semibold text-z-text">{t('sessions.bookLive')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 24 }}>
        {/* ── Group section (hidden when exactly one group) ─────────────────── */}
        {groups.length !== 1 && (
          <View>
            <Text className="mb-2 text-base font-semibold text-z-text">
              {t('sessions.book.selectGroup')}
            </Text>
            {groupsQuery.isPending ? (
              <View className="gap-2">
                <ZSkeleton className="h-8 w-1/2 rounded-full" />
                <ZSkeleton className="h-8 w-1/3 rounded-full" />
              </View>
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
          </View>
        )}

        {/* ── Expert section ────────────────────────────────────────────────── */}
        {groupId !== '' && (
          <View>
            <Text className="mb-2 text-base font-semibold text-z-text">
              {t('sessions.book.selectExpert')}
            </Text>
            {expertsQuery.isPending ? (
              <View className="flex-row gap-2">
                <ZSkeleton className="h-8 w-24 rounded-full" />
                <ZSkeleton className="h-8 w-24 rounded-full" />
              </View>
            ) : experts.length === 0 ? (
              <Text className="text-sm text-z-muted">{t('sessions.book.noExperts')}</Text>
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
          </View>
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
            ) : sessionTypes.length === 0 ? (
              <Text className="text-sm text-z-muted">{t('sessions.book.noSessionTypes')}</Text>
            ) : (
              <View className="gap-2">
                {sessionTypes.map((st) => (
                  <Pressable
                    key={st.id}
                    testID={`book-type-${st.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={st.name}
                    accessibilityState={{ selected: sessionTypeId === st.id }}
                    onPress={() => handleSelectSessionType(st.id)}
                    className={`rounded-lg border p-4 ${
                      sessionTypeId === st.id
                        ? 'border-z-primary bg-z-primary-soft'
                        : 'border-z-border bg-z-surface'
                    }`}
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="font-semibold text-z-text">{st.name}</Text>
                      <Text className="text-sm text-z-muted">{st.duration_minutes} min</Text>
                    </View>
                    <Text className="mt-1 text-sm text-z-muted">{st.description}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Slot section ──────────────────────────────────────────────────── */}
        {groupId !== '' && expertId !== '' && sessionTypeId !== '' && (
          <View>
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
            ) : slots.length === 0 ? (
              <Text className="text-sm text-z-muted">{t('sessions.book.noTimes')}</Text>
            ) : (
              <View className="gap-4">
                {Array.from(slotsByDay.entries()).map(([dayKey, daySlots]) => (
                  <View key={dayKey}>
                    <Text className="mb-2 text-sm font-semibold text-z-muted">
                      {new Date(daySlots[0].starts_at).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {daySlots.map((s) => (
                        <ZChip
                          key={s.starts_at}
                          label={new Date(s.starts_at).toLocaleTimeString([], {
                            timeStyle: 'short',
                          })}
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
          </View>
        )}

        {/* ── Confirm section ───────────────────────────────────────────────── */}
        {slot !== null && selectedExpert !== null && selectedSessionType !== null && (
          <View className="gap-3 rounded-lg border border-z-border bg-z-surface p-4">
            <Text className="text-base font-semibold text-z-text">
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
                {new Date(slot.starts_at).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                {new Date(slot.starts_at).toLocaleTimeString([], { timeStyle: 'short' })}
              </Text>
              <Text className="text-sm text-z-muted">
                {selectedSessionType.duration_minutes} min
              </Text>
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

            {/* Inline error */}
            {submitError !== null && (
              <Text testID="book-error" className="text-sm text-z-danger">
                {submitError}
              </Text>
            )}

            {/* Submit */}
            <ZButton
              testID="book-submit"
              label={
                isSubmitting ? t('sessions.book.booking') : t('sessions.book.bookSession')
              }
              disabled={isSubmitting}
              onPress={() => void handleSubmit()}
            />
          </View>
        )}

        {/* Bottom spacer */}
        <View className="h-8" />
      </ScrollView>
    </ZScreen>
  );
}
