import { useEffect, useReducer, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useLeaveGroupMutation,
} from '../../../api/queries/groups';
import { useAuth } from '../../../auth/auth-store';
import { initialsFromName } from '../../../lib/avatar';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZQueryError } from '../../../components/ui/z-query-error';
import { ZKeyboardAvoidingView } from '../../../components/ui/z-keyboard-avoiding-view';
import { ZCard } from '../../../components/ui/z-card';
import { ZFieldLabel } from '../../../components/ui/z-field-label';
import { ZFieldError } from '../../../components/ui/z-field-error';
import { ZTextInput } from '../../../components/ui/z-text-input';
import { ZTextarea } from '../../../components/ui/z-textarea';
import { ZAvatarInput } from '../../../components/ui/z-avatar-input';
import { ZButton } from '../../../components/ui/z-button';
import { ZConfirmDialog } from '../../../components/ui/z-confirm-dialog';
import { ZDivider } from '../../../components/ui/z-divider';
import { ZIconTile } from '../../../components/ui/z-icon-tile';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { showToast } from '../../../components/ui/z-toast';
import { Touchable } from '../../../components/ui/touchable';
import { useRoleColors } from '../../../theme/native';

/** All editable form fields + the server baseline in one state slice.
 *  Storing them together lets the hydration useEffect call a single dispatch
 *  (avoiding the react-hooks/set-state-in-effect lint violation that results
 *  from calling multiple setState setters inside one effect). */
type FormState = {
  name: string;
  description: string;
  avatar: string | undefined;
  /** Server snapshot used for dirty-tracking. null = not yet hydrated. */
  baseline: { name: string; description: string; avatar: string | undefined } | null;
};

type FormAction =
  | { type: 'hydrate'; name: string; description: string; avatar: string | undefined }
  | { type: 'setName'; value: string }
  | { type: 'setDescription'; value: string }
  | { type: 'setAvatar'; value: string | undefined }
  | { type: 'advanceBaseline' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'hydrate':
      return {
        name: action.name,
        description: action.description,
        avatar: action.avatar,
        baseline: { name: action.name, description: action.description, avatar: action.avatar },
      };
    case 'setName':
      return { ...state, name: action.value };
    case 'setDescription':
      return { ...state, description: action.value };
    case 'setAvatar':
      return { ...state, avatar: action.value };
    case 'advanceBaseline':
      // Move baseline forward to the current field values after a successful save.
      return {
        ...state,
        baseline: { name: state.name, description: state.description, avatar: state.avatar },
      };
  }
}

export default function GroupPreferencesScreen() {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupId = id ?? '';

  const { data, isPending, isError, refetch } = useGroupQuery(groupId);

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const userId = useAuth((s) => s.user?.id ?? null);
  const canEdit = permissions?.includes('groups:preferences:edit') ?? false;
  const canDelete =
    (permissions?.includes('groups:delete') ?? false) &&
    data !== undefined &&
    data.owner_id === userId;
  // Non-owners who can leave see the leave card on the detail screen; the
  // deleteUnavailable copy is shown only when neither delete nor leave applies.
  const canLeave = permissions?.includes('groups:membership:leave') ?? false;

  // Form state starts empty; the hydration effect below populates it once data
  // arrives. We cannot use lazy-init (useState(() => data?.name ?? '')) because
  // React runs hook initializers on the very first render — which happens while
  // isPending=true and data is undefined on any cold-cache path (deep-link,
  // gcTime eviction, slow network). Lazy initializers are never re-run, so the
  // form would stay empty and the Save button would be permanently disabled.
  // All editable fields live in one reducer so the hydration effect dispatches
  // a single action (satisfying react-hooks/set-state-in-effect).
  const [form, dispatch] = useReducer(formReducer, {
    name: '',
    description: '',
    avatar: undefined,
    baseline: null,
  });

  // Hydrate once data first arrives (or when the group id changes).
  // Using data?.id in the dep-array avoids a re-hydration on every refetch
  // while still resetting if the user navigates between two groups.
  useEffect(() => {
    if (!data) return;
    dispatch({
      type: 'hydrate',
      name: data.name,
      description: data.description ?? '',
      avatar: data.avatar ?? undefined,
    });
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [nameTouched, setNameTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { mutateAsync: updateGroup, isPending: saving } = useUpdateGroupMutation(groupId);
  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteGroupMutation(groupId);
  const { mutateAsync: leaveGroup, isPending: leaving } = useLeaveGroupMutation(groupId);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { name, description, avatar, baseline } = form;

  const nameInvalid = nameTouched && name.trim() === '';
  // Compute dirty by comparing current fields against the hydrated baseline.
  // baseline=null means data hasn't arrived yet — treat as not dirty.
  const invalid = name.trim() === '';
  const hasChanges =
    baseline !== null &&
    (name !== baseline.name ||
      description !== baseline.description ||
      avatar !== baseline.avatar);
  // Mirrors the web `saveDisabled = invalid || !hasChanges || loading`.
  const saveDisabled = invalid || !hasChanges || saving;

  async function handleSave() {
    setNameTouched(true);
    if (saveDisabled) return;
    setFormError(null);
    try {
      await updateGroup({
        name: name.trim(),
        description: description.trim(),
        // Only send avatar when the user picked a new one; empty keeps the existing image.
        avatar: avatar && avatar !== (baseline?.avatar ?? undefined) ? avatar : undefined,
      });
      // Advance baseline so the form is no longer dirty after a successful save.
      dispatch({ type: 'advanceBaseline' });
      showToast(t('toast.successTitle'), t('groups.updated'), 'success');
    } catch {
      setFormError(t('groups.updateFailed'));
    }
  }

  async function handleConfirmLeave() {
    setShowLeaveConfirm(false);
    try {
      await leaveGroup();
      showToast(t('groups.leave.success', { group: data?.name ?? '' }), undefined, 'success');
      router.back();
    } catch {
      showToast(t('toast.errorTitle'), t('groups.leave.failed'), 'error');
    }
  }

  async function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    try {
      await deleteGroup();
      showToast(t('toast.successTitle'), t('groups.deleted'), 'success');
      router.replace('/(tabs)/groups');
    } catch {
      showToast(t('toast.errorTitle'), t('groups.deleteFailed'), 'error');
    }
  }

  /** One danger-zone action row (mock: list rows inside a danger-bordered
   *  card — leave and delete side by side, each confirmed via dialog). */
  function dangerRow(opts: {
    testID: string;
    icon: 'logout' | 'trash';
    title: string;
    subtitle: string;
    onPress: () => void;
  }) {
    return (
      <Touchable testID={opts.testID} accessibilityLabel={opts.title} onPress={opts.onPress}>
        <View className="flex-row items-center gap-3 px-3 py-3">
          <ZIconTile
            tone="danger"
            size="sm"
            icon={<ZSymbol name={opts.icon} label="" size={18} color={color('danger')} />}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-bold text-z-danger">{opts.title}</Text>
            <Text className="mt-0.5 text-[12px] leading-4 text-z-muted" numberOfLines={2}>
              {opts.subtitle}
            </Text>
          </View>
        </View>
      </Touchable>
    );
  }

  if (isPending) {
    return (
      <ZScreen edges={['bottom']} className="gap-4 p-4">
        <Stack.Screen options={{ title: t('groups.preferences') }} />
        <ZSkeleton testID="group-preferences-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-11 w-full" />
        <ZSkeleton className="h-20 w-full" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen edges={['bottom']} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: t('groups.preferences') }} />
        <ZQueryError
          title={t('groups.phase4.detailFailed')}
          onRetry={() => void refetch()}
        />
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      {/* Native header carries the Save action (mock: header text button,
          disabled until dirty — same convention as preferences.tsx). */}
      <Stack.Screen
        options={{
          title: t('groups.preferences'),
          headerRight: canEdit
            ? () => (
                <ZButton
                  testID="group-save"
                  variant="link"
                  label={t('common.actions.save')}
                  disabled={saveDisabled}
                  loading={saving}
                  onPress={() => void handleSave()}
                />
              )
            : undefined,
        }}
      />
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {canEdit ? (
            <>
              {/* Avatar standalone above the card, centered + directly tappable
                  (mock; no intro paragraph, no labeled avatar field in the card). */}
              <View className="items-center px-4 pb-5 pt-3">
                <ZAvatarInput
                  centered
                  value={avatar}
                  onChange={(v) => dispatch({ type: 'setAvatar', value: v })}
                  fallback={initialsFromName(name)}
                  alt={name}
                  label={t('avatar.selectImage')}
                  disabled={saving}
                />
              </View>
              <View className="px-4">
                <ZCard>
                  <View className="gap-4">
                    <View className="gap-2">
                      <ZFieldLabel label={t('groups.groupName')} />
                      <ZTextInput
                        testID="group-name-input"
                        accessibilityLabel={t('groups.groupName')}
                        value={name}
                        onChangeText={(v) => dispatch({ type: 'setName', value: v })}
                        placeholder={t('groups.namePlaceholder')}
                        invalid={nameInvalid}
                      />
                      {nameInvalid ? <ZFieldError message={t('groups.groupNameRequired')} /> : null}
                    </View>

                    <View className="gap-2">
                      <ZFieldLabel label={t('common.fields.description')} />
                      <ZTextarea
                        accessibilityLabel={t('common.fields.description')}
                        value={description}
                        onChangeText={(v) => dispatch({ type: 'setDescription', value: v })}
                        placeholder={t('groups.descriptionPlaceholder')}
                        rows={3}
                      />
                    </View>

                    {/* Form-save failure → inline banner using the standard danger tokens. */}
                    {formError ? (
                      <View className="rounded-md border border-z-danger bg-z-danger/10 p-3">
                        <Text className="text-sm text-z-danger">{formError}</Text>
                      </View>
                    ) : null}
                  </View>
                </ZCard>
              </View>
            </>
          ) : null}

          {/* Danger zone — one danger-bordered card with action ROWS (mock),
              showing every action the member may perform. */}
          {canLeave || canDelete ? (
            <View className="px-4 pt-6">
              <Text className="mb-2 px-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-role-danger">
                {t('groups.dangerZone')}
              </Text>
              <View className="overflow-hidden rounded-2xl border border-z-danger/40 bg-z-surface">
                {canLeave
                  ? dangerRow({
                      testID: 'preferences-leave-btn',
                      icon: 'logout',
                      title: t('groups.leave.action'),
                      subtitle: t('groups.leave.summary'),
                      onPress: () => setShowLeaveConfirm(true),
                    })
                  : null}
                {canLeave && canDelete ? <ZDivider inset={58} /> : null}
                {canDelete
                  ? dangerRow({
                      testID: 'group-delete',
                      icon: 'trash',
                      title: t('groups.deleteThisGroup'),
                      subtitle: t('groups.deleteSummary'),
                      onPress: () => setShowDeleteConfirm(true),
                    })
                  : null}
              </View>
            </View>
          ) : (
            // Neither owner (can delete) nor a member who can leave: explain why.
            <View className="px-4 pt-6">
              <Text className="text-[15px] leading-6 text-z-muted">
                {t('groups.deleteUnavailable')}
              </Text>
            </View>
          )}

          <ZConfirmDialog
            testID="preferences-leave-dialog"
            visible={showLeaveConfirm}
            tone="danger"
            title={t('groups.leave.title')}
            description={t('groups.leave.confirm', { group: data.name })}
            confirmLabel={t('groups.leave.action')}
            cancelLabel={t('common.actions.cancel')}
            confirmDisabled={leaving}
            onConfirm={() => void handleConfirmLeave()}
            onCancel={() => setShowLeaveConfirm(false)}
          />
          <ZConfirmDialog
            testID="preferences-delete-dialog"
            visible={showDeleteConfirm}
            tone="danger"
            title={t('groups.deleteGroup')}
            description={t('groups.deleteConfirm')}
            confirmLabel={t('groups.deleteGroup')}
            cancelLabel={t('common.actions.cancel')}
            confirmDisabled={deleting}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
