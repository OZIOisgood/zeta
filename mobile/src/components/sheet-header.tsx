/**
 * In-content header for native formSheet routes — Android only.
 *
 * The sheet routes (upload, book, cancel/[bookingId]) configure a native header
 * via <Stack.Screen options={{ title, headerLeft }}>. iOS renders it inside the
 * UISheetPresentationController, but Android's react-native-screens formSheet
 * silently ignores header options — the sheets shipped without a title or any
 * close affordance, and content expecting a header rendered clipped under the
 * sheet's top edge. This component IS that header on Android; on iOS it
 * renders null so the native header is not duplicated.
 */

import { Platform, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ZIconButton } from './ui/z-icon-button';
import { ZSymbol } from './ui/z-symbol';

type SheetHeaderProps = {
  title: string;
  onClose: () => void;
  testID?: string;
};

export function SheetHeader({ title, onClose, testID }: SheetHeaderProps) {
  const { t } = useTranslation();
  if (Platform.OS !== 'android') return null;
  return (
    <View testID={testID} className="flex-row items-center justify-between px-4 pb-1 pt-3">
      <Text className="flex-1 text-[19px] font-extrabold text-z-text" numberOfLines={1}>
        {title}
      </Text>
      <ZIconButton label={t('common.actions.cancel')} onPress={onClose} testID={testID ? `${testID}-close` : undefined}>
        <ZSymbol name="close" label="" size={22} />
      </ZIconButton>
    </View>
  );
}
