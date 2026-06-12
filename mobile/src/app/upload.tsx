import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useGroupsQuery } from '../api/queries/groups';
import { api } from '../auth/auth-store';
import { uploadStore } from '../upload/upload-store';
import type { PickedFile } from '../upload/upload-store';
import { ZButton } from '../components/ui/z-button';
import { ZChip } from '../components/ui/z-chip';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTextInput } from '../components/ui/z-text-input';
import { ZTextarea } from '../components/ui/z-textarea';
import { colors } from '../theme/colors';

export default function UploadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: groups, isPending, isError, refetch } = useGroupsQuery();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSubmit = !busy && title.trim().length > 0 && selectedGroupId !== null && picked.length > 0;

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

  return (
    <ZScreen>
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-4 flex-row items-center gap-3">
          <ZIconButton label={t('common.actions.back')} onPress={() => router.back()}>
            <ArrowLeft color={colors.muted} size={24} />
          </ZIconButton>
          <Text className="text-lg font-semibold text-z-text">{t('common.actions.uploadVideo')}</Text>
        </View>

        {/* Title */}
        <View className="mb-3">
          <Text className="mb-1 text-sm font-medium text-z-text">{t('common.fields.title')}</Text>
          <ZTextInput
            accessibilityLabel={t('common.fields.title')}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Jump line take 2"
          />
        </View>

        {/* Description */}
        <View className="mb-3">
          <Text className="mb-1 text-sm font-medium text-z-text">{t('common.fields.description')}</Text>
          <ZTextarea
            accessibilityLabel={t('common.fields.description')}
            value={description}
            onChangeText={setDescription}
            placeholder="Add context, goals, or notes for the reviewer."
            rows={3}
          />
        </View>

        {/* Group chips */}
        <View className="mb-3">
          <Text className="mb-2 text-sm font-medium text-z-text">{t('common.fields.group')}</Text>
          {isPending && (
            <View className="flex-row gap-2">
              <ZSkeleton className="h-8 w-24 rounded-full" />
              <ZSkeleton className="h-8 w-24 rounded-full" />
            </View>
          )}
          {isError && (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-z-danger">Groups could not be loaded.</Text>
              <ZButton label={t('upload.retry')} variant="ghost" onPress={() => void refetch()} />
            </View>
          )}
          {groups && (
            <View className="flex-row flex-wrap gap-2">
              {groups.map((group) => (
                <ZChip
                  key={group.id}
                  label={group.name}
                  selected={selectedGroupId === group.id}
                  onPress={() => setSelectedGroupId(group.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Pick videos */}
        <View className="mb-3">
          <Text className="mb-2 text-sm font-medium text-z-text">Videos</Text>
          <ZButton label="Pick videos" variant="secondary" onPress={() => void handlePickVideos()} />
          {picked.length > 0 && (
            <View className="mt-2 gap-1">
              {picked.map((file, index) => (
                <View
                  key={`${file.localUri}-${index}`}
                  className="flex-row items-center justify-between rounded-lg border border-z-border bg-z-surface px-3 py-2"
                >
                  <Text className="flex-1 text-sm text-z-text" numberOfLines={1}>
                    {file.filename}
                  </Text>
                  <ZIconButton
                    size="sm"
                    label={`Remove ${file.filename}`}
                    onPress={() => handleRemovePicked(index)}
                    className="ml-2"
                  >
                    <X color={colors.muted} size={16} />
                  </ZIconButton>
                </View>
              ))}
            </View>
          )}
        </View>

        {failed && (
          <Text className="mb-3 text-sm text-z-danger">{t('upload.uploadFailed')}</Text>
        )}

        <ZButton label={t('upload.startUpload')} onPress={() => void handleSubmit()} disabled={!canSubmit} />
      </ScrollView>
    </ZScreen>
  );
}
