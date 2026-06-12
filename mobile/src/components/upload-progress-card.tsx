import { Pressable, Text, View } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { UploadJob } from '../upload/upload-store';
import { colors } from '../theme/colors';

export function UploadProgressCard({
  job,
  onRetry,
  onDismiss,
}: {
  job: UploadJob;
  onRetry: (jobId: string, videoId: string) => void;
  onDismiss: (jobId: string) => void;
}) {
  const { t } = useTranslation();
  const doneCount = job.files.filter((f) => f.status === 'done').length;
  const overall =
    job.files.length > 0
      ? job.files.reduce((sum, f) => sum + f.progress, 0) / job.files.length
      : 0;
  const firstFailed = job.files.find((f) => f.status === 'failed');

  return (
    <View className="rounded-lg border border-z-border bg-z-surface p-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-z-text">{job.title}</Text>

        {job.status === 'done' && (
          <Pressable
            testID="upload-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={() => onDismiss(job.id)}
          >
            <X color={colors.muted} size={16} />
          </Pressable>
        )}

        {job.status === 'failed' && firstFailed && (
          <Pressable
            testID="upload-retry"
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => onRetry(job.id, firstFailed.videoId)}
          >
            <RotateCcw color={colors.muted} size={16} />
          </Pressable>
        )}
      </View>

      {(job.status === 'uploading' || job.status === 'completing') && (
        <View className="gap-1">
          <Text className="text-xs text-z-muted">
            {doneCount}/{job.files.length}
          </Text>
          <View className="h-2 overflow-hidden rounded-full bg-z-surface-muted">
            <View
              className="h-full rounded-full bg-z-primary"
              style={{ width: `${overall * 100}%` }}
            />
          </View>
        </View>
      )}

      {job.status === 'failed' && (
        <Text className="text-xs text-z-danger">{t('upload.uploadFailed')}</Text>
      )}
    </View>
  );
}
