import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
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
import { ZDangerZoneCard } from '../../../components/ui/z-danger-zone-card';
import { showToast } from '../../../components/ui/z-toast';

export default function GroupPreferencesScreen() {
  const { t } = useTranslation();
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

  // Form fields start empty; a useEffect hydrates them once data resolves.
  // We cannot use lazy-init (useState(() => data?.name ?? '')) because React
  // runs hook initializers on the very first render — which happens while
  // isPending=true and data is undefined on any cold-cache path (deep-link,
  // gcTime eviction, slow network). Lazy initializers are never re-run, so the
  // form would stay empty and the Save button would be permanently disabled.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  // Baseline snapshot of the server values, used for dirty tracking.
  // null = not yet hydrated; set once data first loads.
  const [baseline, setBaseline] = useState<{
    name: string;
    description: string;
    avatar: string | undefined;
  } | null>(null);

  // Hydrate form + baseline once data arrives (handles cold-cache path).
  // data.id in the dep-array means we also reset if the user somehow navigates
  // between two group preferences screens without unmounting.
  useEffect(() => {
    if (!data) return;
    const initial = {
      name: data.name,
      description: data.description ?? '',
      avatar: data.avatar ?? undefined,
    };
    setName(initial.name);
    setDescription(initial.description);
    setAvatar(initial.avatar);
    setBaseline(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [nameTouched, setNameTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { mutateAsync: updateGroup, isPending: saving } = useUpdateGroupMutation(groupId);
  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteGroupMutation(groupId);

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
      // Advance the baseline so the form is no longer dirty after a successful save.
      setBaseline({ name, description, avatar });
      showToast(t('toast.successTitle'), t('groups.updated'), 'success');
    } catch {
      setFormError(t('groups.updateFailed'));
    }
  }

  async function handleConfirmDelete() {
    try {
      await deleteGroup();
      showToast(t('toast.successTitle'), t('groups.deleted'), 'success');
      router.replace('/(tabs)/groups');
    } catch {
      showToast(t('toast.errorTitle'), t('groups.deleteFailed'), 'error');
    }
  }

  if (isPending) {
    return (
      <ZScreen className="gap-4 p-4">
        <ZSkeleton testID="group-preferences-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-11 w-full" />
        <ZSkeleton className="h-20 w-full" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen className="items-center justify-center px-8">
        <ZQueryError
          title={t('groups.phase4.detailFailed')}
          onRetry={() => void refetch()}
        />
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form header */}
          <View className="p-4">
            <Text className="text-2xl font-semibold text-z-text">{t('groups.preferences')}</Text>
            <Text className="mt-1 text-sm leading-6 text-z-muted">
              {t('groups.phase4.preferencesSummary')}
            </Text>
          </View>

          {canEdit ? (
            <View className="px-4">
              <ZCard>
                <View className="gap-5">
                  <View className="gap-2">
                    <ZFieldLabel label={t('groups.groupName')} />
                    <ZTextInput
                      testID="group-name-input"
                      accessibilityLabel={t('groups.groupName')}
                      value={name}
                      onChangeText={setName}
                      placeholder={t('groups.namePlaceholder')}
                      invalid={nameInvalid}
                    />
                    {nameInvalid ? <ZFieldError message={t('groups.groupNameRequired')} /> : null}
                  </View>

                  <View className="gap-2">
                    <ZFieldLabel label={t('groups.avatarTitle')} />
                    <ZAvatarInput
                      value={avatar}
                      onChange={setAvatar}
                      fallback={initialsFromName(name)}
                      alt={name}
                      label={t('avatar.selectImage')}
                      disabled={saving}
                    />
                  </View>

                  <View className="gap-2">
                    <ZFieldLabel label={t('common.fields.description')} />
                    <ZTextarea
                      accessibilityLabel={t('common.fields.description')}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t('groups.descriptionPlaceholder')}
                    />
                  </View>

                  {/* Form-save failure → inline banner using the standard danger tokens. */}
                  {formError ? (
                    <View className="rounded-md border border-z-danger bg-z-danger/10 p-3">
                      <Text className="text-sm text-z-danger">{formError}</Text>
                    </View>
                  ) : null}

                  <ZButton
                    testID="group-save"
                    label={t('common.actions.save')}
                    onPress={() => void handleSave()}
                    disabled={saveDisabled}
                  />
                </View>
              </ZCard>
            </View>
          ) : null}

          {/* Danger zone — owner-only delete via the shared ZDangerZoneCard (WP-UI0). */}
          {canDelete ? (
            <View className="px-4 pt-6">
              <ZDangerZoneCard
                testID="group-delete"
                title={t('groups.deleteThisGroup')}
                description={t('groups.deleteSummary')}
                actionLabel={t('groups.deleteGroup')}
                onAction={() => void handleConfirmDelete()}
                loading={deleting}
                confirmTitle={t('groups.deleteGroup')}
                confirmMessage={t('groups.deleteConfirm')}
                confirmLabel={t('groups.deleteGroup')}
              />
            </View>
          ) : !canLeave ? (
            // Neither owner (can delete) nor a member who can leave: explain why.
            <View className="px-4 pt-6">
              <Text className="text-sm leading-6 text-z-muted">
                {t('groups.deleteUnavailable')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
