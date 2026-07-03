/**
 * ZQueryError — iOS implementation.
 *
 * Composes ZEmptyState.ios (ContentUnavailableView) + ZButton (retry).
 * Passes `iconSystemImage` so ContentUnavailableView renders a native SF
 * Symbol. "exclamationmark.icloud" is the closest SF Symbol for a
 * "cloud/network error" concept (available iOS 15+). The retry ZButton
 * appears below ContentUnavailableView (outside the native widget, since
 * ContentUnavailableView has no actions slot in the @expo/ui API).
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/empty-states
 */

import { useTranslation } from 'react-i18next';
import { ZEmptyState } from './z-empty-state';
import { ZButton } from './z-button';
import type { ZQueryErrorProps } from './z-query-error.types';

export type { ZQueryErrorProps } from './z-query-error.types';

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
      iconSystemImage="exclamationmark.icloud"
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
