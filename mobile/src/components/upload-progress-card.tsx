import { Text, View } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { UploadJob } from '../upload/upload-store';
import { useRoleColors } from '../theme/native';
import { ZIconButton } from './ui/z-icon-button';

export function UploadProgressCard({
  job,
  onRetry,
  onDismiss,
}: {
  job: UploadJob;
  onRetry: (jobId: string) => void;
  onDismiss: (jobId: string) => void;
}) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const doneCount = job.files.filter((f) => f.status === 'done').length;
  const overall =
    job.files.length > 0
      ? job.files.reduce((sum, f) => sum + f.progress, 0) / job.files.length
      : 0;
  // Both actions hang off the JOB status, never off a failed file. When only the
  // /complete step failed, every file is 'done' and there is no failed file to
  // key on — the card used to render neither action, leaving a permanent error
  // tile that survived restarts via the persisted queue.
  const isFailed = job.status === 'failed';
  const isTerminal = isFailed || job.status === 'done';

  return (
    <View className="rounded-lg border border-z-border bg-z-surface p-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="flex-1 text-base font-bold text-z-text">{job.title}</Text>

        <View className="flex-row items-center">
          {isFailed && (
            <ZIconButton
              testID="upload-retry"
              label={t('common.actions.retry')}
              size="sm"
              onPress={() => onRetry(job.id)}
            >
              <RotateCcw color={color('onSurfaceVariant')} size={16} />
            </ZIconButton>
          )}

          {isTerminal && (
            <ZIconButton
              testID="upload-dismiss"
              label={t('common.actions.close')}
              size="sm"
              onPress={() => onDismiss(job.id)}
            >
              <X color={color('onSurfaceVariant')} size={16} />
            </ZIconButton>
          )}
        </View>
      </View>

      {(job.status === 'uploading' || job.status === 'completing') && (
        <View className="gap-1">
          <Text className="text-xs font-medium text-z-muted">
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
