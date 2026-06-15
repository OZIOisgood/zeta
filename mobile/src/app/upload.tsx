import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ZSymbol } from '../components/ui/z-symbol';
import { useTranslation } from 'react-i18next';
import { useGroupsQuery } from '../api/queries/groups';
import { api } from '../auth/auth-store';
import { uploadStore } from '../upload/upload-store';
import type { PickedFile } from '../upload/upload-store';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZScreen } from '../components/ui/z-screen';
import { ZSelect } from '../components/ui/z-select';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZStepper, type ZStepState } from '../components/ui/z-stepper';
import { ZTextInput } from '../components/ui/z-text-input';
import { ZTextarea } from '../components/ui/z-textarea';
import { colors } from '../theme/colors';

type UploadStep = 'files' | 'details' | 'review';

const STEP_ORDER: UploadStep[] = ['files', 'details', 'review'];

export default function UploadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: groups, isPending, isError, refetch } = useGroupsQuery();

  const [activeStep, setActiveStep] = useState<UploadStep>('files');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const titleEmpty = title.trim().length === 0;
  const groupMissing = selectedGroupId === null;
  const canSubmit = !busy && !titleEmpty && !groupMissing && picked.length > 0;

  function canReach(step: UploadStep): boolean {
    if (step === 'details' || step === 'review') {
      if (picked.length === 0) return false;
    }
    if (step === 'review') {
      if (titleEmpty || groupMissing) return false;
    }
    return true;
  }

  function goToStep(step: UploadStep) {
    if (!canReach(step)) {
      setTouched(true);
      return;
    }
    setActiveStep(step);
  }

  function stepState(step: UploadStep): ZStepState {
    const activeIndex = STEP_ORDER.indexOf(activeStep);
    const stepIndex = STEP_ORDER.indexOf(step);
    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'upcoming';
  }

  async function handlePickVideos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    const newFiles: PickedFile[] = result.assets.map((asset) => ({
      filename: asset.fileName ?? asset.uri.split('/').pop() ?? 'video.mp4',
      localUri: asset.uri,
    }));
    setPicked((prev) => [...prev, ...newFiles]);
  }

  function handleRemovePicked(index: number) {
    setPicked((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit || !selectedGroupId) return;
    setBusy(true);
    setFailed(false);
    try {
      const { data, error } = await api.POST('/assets', {
        body: {
          title: title.trim(),
          description,
          filenames: picked.map((p) => p.filename),
          group_id: selectedGroupId,
        },
      });
      if (error || !data) {
        setFailed(true);
        return;
      }
      // Fire-and-forget: upload continues in background
      void uploadStore.getState().enqueue(data, picked, title.trim());
      router.back();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const selectedGroupName = groups?.find((group) => group.id === selectedGroupId)?.name ?? '';

  return (
    <ZScreen edges={['bottom']}>
      {/* Native sheet header with title + cancel affordance. */}
      <Stack.Screen
        options={{
          title: t('upload.title'),
          headerLeft: () => (
            <ZButton
              testID="upload-cancel"
              label={t('common.actions.cancel')}
              variant="ghost"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      {/* Note: no ZKeyboardAvoidingView here — this is a formSheet route and the
          native sheet owns keyboard avoidance (AGENTS.md: "Do not apply the KAV
          pattern inside native sheet routes"). keyboardShouldPersistTaps is applied
          to the ScrollView below. */}
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

          {/* Header card */}
          <ZCard className="mb-4">
            <Text className="text-2xl font-semibold text-z-text">{t('upload.title')}</Text>
            <Text className="mt-2 text-sm leading-6 text-z-muted">{t('upload.summary')}</Text>
          </ZCard>
  
          {/* Stepper */}
          <View className="mb-4">
            <ZStepper
              steps={[
                { label: t('upload.selectVideo'), state: stepState('files') },
                { label: t('upload.enterDetails'), state: stepState('details') },
                { label: t('upload.upload'), state: stepState('review') },
              ]}
              onStepPress={(index) => goToStep(STEP_ORDER[index])}
            />
          </View>
  
          {/* Step: files */}
          {activeStep === 'files' && (
            <ZCard>
              <ZButton
                testID="upload-pick"
                label={t('upload.selectVideo')}
                variant="secondary"
                onPress={() => void handlePickVideos()}
              />
              <Text className="mt-2 text-xs text-z-muted">{t('upload.multiPartHint')}</Text>
  
              {picked.length > 0 && (
                <View className="mt-3 gap-2">
                  {picked.map((file, index) => (
                    <View
                      key={`${file.localUri}-${index}`}
                      className="flex-row items-center rounded-lg border border-z-border bg-z-surface px-3 py-2"
                    >
                      <ZSymbol name="file-video" label={file.filename} size={18} color={colors.primary} />
                      <Text className="ml-2 flex-1 text-sm font-semibold text-z-text" numberOfLines={1}>
                        {file.filename}
                      </Text>
                      <ZIconButton
                        size="sm"
                        label={t('common.actions.remove')}
                        onPress={() => handleRemovePicked(index)}
                        className="ml-2"
                      >
                        <ZSymbol name="close" label={t('common.actions.remove')} size={16} color={colors.muted} />
                      </ZIconButton>
                    </View>
                  ))}
                </View>
              )}
  
              <View className="mt-4 flex-row justify-end">
                <ZButton
                  label={t('common.actions.next')}
                  onPress={() => goToStep('details')}
                  disabled={picked.length === 0}
                />
              </View>
            </ZCard>
          )}
  
          {/* Step: details */}
          {activeStep === 'details' && (
            <ZCard>
              <View className="mb-3">
                <ZFieldLabel label={t('common.fields.title')} required />
                <ZTextInput
                  accessibilityLabel={t('common.fields.title')}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('upload.titlePlaceholder')}
                  invalid={touched && titleEmpty}
                />
                {touched && titleEmpty && <ZFieldError message={t('upload.titleRequired')} />}
              </View>
  
              <View className="mb-3">
                <ZFieldLabel label={t('common.fields.description')} />
                <ZTextarea
                  accessibilityLabel={t('common.fields.description')}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('upload.descriptionPlaceholder')}
                  rows={3}
                />
              </View>
  
              <View className="mb-3">
                <ZFieldLabel label={t('common.fields.group')} required />
                {isPending && <ZSkeleton className="h-11 w-full rounded-md" />}
                {isError && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-z-danger">{t('groups.phase4.loadFailed')}</Text>
                    <ZButton label={t('common.actions.retry')} variant="ghost" onPress={() => void refetch()} />
                  </View>
                )}
                {groups && (
                  <>
                    <ZSelect
                      accessibilityLabel={t('common.fields.group')}
                      value={selectedGroupId ?? undefined}
                      options={groups.map((group) => ({ value: group.id, label: group.name }))}
                      placeholder={t('upload.chooseGroup')}
                      onValueChange={setSelectedGroupId}
                      invalid={touched && groupMissing}
                    />
                    {touched && groupMissing && <ZFieldError message={t('upload.groupRequired')} />}
                  </>
                )}
              </View>
  
              <View className="mt-1 flex-row justify-end gap-2">
                <ZButton
                  label={t('common.actions.back')}
                  variant="secondary"
                  onPress={() => goToStep('files')}
                />
                <ZButton label={t('common.actions.next')} onPress={() => goToStep('review')} />
              </View>
            </ZCard>
          )}
  
          {/* Step: review */}
          {activeStep === 'review' && (
            <ZCard>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
                  <ZSymbol name="check" label={t('upload.readyTitle')} size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-z-text">{t('upload.readyTitle')}</Text>
                  <Text className="mt-1 text-sm text-z-muted">{t('upload.readySummary')}</Text>
                </View>
              </View>
  
              <View className="mt-4 gap-2 rounded-md border border-z-border p-3">
                <Text className="text-sm text-z-text">
                  <Text className="font-semibold">{t('common.fields.title')}: </Text>
                  {title}
                </Text>
                <Text className="text-sm text-z-text">
                  <Text className="font-semibold">{t('common.fields.group')}: </Text>
                  {selectedGroupName}
                </Text>
                <Text className="text-sm text-z-text">
                  <Text className="font-semibold">{t('upload.selectVideo')}: </Text>
                  {picked.length}
                </Text>
              </View>
  
              {failed && (
                <Text className="mt-3 text-sm font-semibold text-z-danger">{t('upload.uploadFailed')}</Text>
              )}
  
              <View className="mt-4 flex-row justify-end gap-2">
                <ZButton
                  label={t('common.actions.back')}
                  variant="secondary"
                  onPress={() => goToStep('details')}
                />
                <ZButton
                  testID="upload-submit"
                  label={t('upload.startUpload')}
                  onPress={() => void handleSubmit()}
                  disabled={!canSubmit}
                />
              </View>
            </ZCard>
          )}
        </ScrollView>
    </ZScreen>
  );
}
