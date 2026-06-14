import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateGroupMutation } from '../../api/queries/groups';
import { ZAvatarInput } from '../../components/ui/z-avatar-input';
import { ZBackHeader } from '../../components/ui/z-back-header';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZFieldError } from '../../components/ui/z-field-error';
import { ZFieldLabel } from '../../components/ui/z-field-label';
import { ZKeyboardAvoidingView } from '../../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZTextInput } from '../../components/ui/z-text-input';
import { ZTextarea } from '../../components/ui/z-textarea';
import { showToast } from '../../components/ui/z-toast';

/**
 * Create-group form screen. Mobile counterpart of the web
 * `create-group-page.component.ts`. Form: name (required, non-blank),
 * avatar (required — backend 400s without one), description (optional).
 * Inline error banner on failure; success toast + navigate to group detail.
 */
export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateGroupMutation();

  const nameEmpty = name.trim().length === 0;
  const avatarMissing = avatar === null;

  async function handleSubmit() {
    setTouched(true);
    if (nameEmpty || avatarMissing) return;

    setErrorBanner(null);
    try {
      const group = await mutateAsync({
        name: name.trim(),
        avatar: avatar!,
        description: description.trim() || undefined,
      });
      showToast(t('groups.create'), undefined, 'success');
      router.replace(`/group/${group.id}`);
    } catch {
      setErrorBanner(t('groups.updateFailed'));
    }
  }

  return (
    <ZScreen>
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back navigation */}
          <ZBackHeader title={t('groups.create')} />

          {/* Header card — mirrors the web form card */}
          <ZCard className="mb-4 mt-2">
            <Text className="text-2xl font-semibold text-z-text">{t('groups.createNew')}</Text>
            <Text className="mt-2 text-sm leading-6 text-z-muted">
              {t('groups.createFirstDescription')}
            </Text>
          </ZCard>

          {/* Form card */}
          <ZCard className="gap-5">
            {/* Name */}
            <View>
              <ZFieldLabel label={t('groups.groupName')} required />
              <ZTextInput
                testID="create-group-name"
                accessibilityLabel={t('groups.groupName')}
                value={name}
                onChangeText={setName}
                placeholder={t('groups.namePlaceholder')}
                invalid={touched && nameEmpty}
              />
              {touched && nameEmpty && (
                <ZFieldError message={t('groups.groupNameRequired')} />
              )}
            </View>

            {/* Avatar */}
            <View>
              <ZFieldLabel label={t('common.fields.avatar')} required />
              <ZAvatarInput
                testID="create-group-avatar"
                value={avatar ?? undefined}
                onChange={(b64) => setAvatar(b64)}
                label={t('avatar.selectImage')}
                disabled={isPending}
              />
              {touched && avatarMissing && (
                <ZFieldError message={t('groups.avatarRequired')} />
              )}
            </View>

            {/* Description */}
            <View>
              <ZFieldLabel label={t('common.fields.description')} />
              <ZTextarea
                testID="create-group-description"
                accessibilityLabel={t('common.fields.description')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('groups.descriptionPlaceholder')}
                rows={4}
              />
            </View>

            {/* Error banner */}
            {errorBanner && (
              <View
                testID="create-group-error"
                className="rounded-md border border-z-danger bg-z-danger/10 p-3"
              >
                <Text className="text-sm text-z-danger">{errorBanner}</Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row justify-end gap-2">
              <ZButton
                label={t('common.actions.cancel')}
                variant="secondary"
                disabled={isPending}
                onPress={() => router.back()}
              />
              <ZButton
                testID="create-group-submit"
                label={isPending ? t('groups.creating') : t('common.actions.create')}
                disabled={isPending}
                onPress={() => void handleSubmit()}
              />
            </View>
          </ZCard>
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
