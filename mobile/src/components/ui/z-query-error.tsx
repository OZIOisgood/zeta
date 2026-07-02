import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ZEmptyState } from './z-empty-state';
import { ZButton } from './z-button';
import type { ZQueryErrorProps } from './z-query-error.types';

export type { ZQueryErrorProps } from './z-query-error.types';

/**
 * ZQueryError — NativeWind fallback (web / Storybook / jest).
 *
 * Standard "could not load this surface" state: a danger-toned CloudOff glyph,
 * a title, the shared error description, and a secondary retry button. Mobile
 * counterpart of the repeated query-error block; pass `description`/`retryLabel`
 * to override the defaults and `testID` to tag the retry button.
 * On native platforms the .ios.tsx and .android.tsx variants pass the
 * appropriate icon representation to ZEmptyState.
 */
export function ZQueryError({
  title,
  description,
  retryLabel,
  onRetry,
  testID,
}: ZQueryErrorProps) {
  const { t } = useTranslation();
  return (
    <ZEmptyState
      title={title}
      description={description ?? t('home.error.description')}
      icon={<CloudOff color={colors.danger} size={24} />}
    >
      <ZButton
        testID={testID}
        label={retryLabel ?? t('common.actions.retry')}
        variant="secondary"
        onPress={onRetry}
      />
    </ZEmptyState>
  );
}
