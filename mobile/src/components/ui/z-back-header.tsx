import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { ZIconButton } from './z-icon-button';

/**
 * Header for pushed / detail / sub-screens: a leading back button + title +
 * optional one-line subtitle + optional trailing action slot. The mobile
 * counterpart of the web detail-page back affordance. NOTE: `ZPageHeader`
 * stays reserved for the 5 tab index screens — use `ZBackHeader` on any route
 * reached via `router.push` (reports, availability, notifications, group
 * preferences, account). Default `onBack` is `router.back()`.
 */
export function ZBackHeader({
  title,
  subtitle,
  onBack,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  testID?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View testID={testID} className="flex-row items-center gap-2 px-2 py-2">
      <ZIconButton label={t('common.actions.back')} onPress={handleBack}>
        <ArrowLeft color={colors.text} size={20} />
      </ZIconButton>
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold text-z-text" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-z-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
