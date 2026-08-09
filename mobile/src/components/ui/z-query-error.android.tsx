/**
 * ZQueryError — Android implementation.
 *
 * Composes ZEmptyState.android (role-token-styled RN column) + ZButton (retry).
 * The CloudOff icon is rendered as a lucide ReactNode; ZEmptyState.android
 * accepts this via its `icon` prop. The danger color comes from role tokens.
 *
 * Material 3 reference: https://m3.material.io/foundations/communication/empty-states
 */

import { useTranslation } from 'react-i18next';
import { useRoleColors } from '../../theme/native';
import { ZEmptyState } from './z-empty-state';
import { ZButton } from './z-button';
import { ZSymbol } from './z-symbol';
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
  const { color } = useRoleColors();

  return (
    <ZEmptyState
      title={title}
      description={description ?? t('home.error.description')}
      icon={<ZSymbol name="cloud-off" label="" size={24} color={color('danger')} />}
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
