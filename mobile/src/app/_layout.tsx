import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { initI18n } from '../i18n';
import { authStore, useAuth } from '../auth/auth-store';
import { queryClient } from '../api/query-client';
import { colors } from '../theme/colors';
import { ZToastHost } from '../components/ui/z-toast';

void initI18n();

// App-wide text default → Nunito Sans Regular (400). NativeWind v4 drops the
// universal `*` selector, so the no-weight default can't live in global.css;
// the weight utilities (.font-medium/.font-semibold/.font-bold/.font-extrabold)
// still override font-family per weight via global.css, and those className
// styles are merged AFTER this default, so they win. This is the standard RN
// pattern for an app-wide font default and reaches every <Text>, including
// those rendered inside z-* primitives. Guarded so it only sets fontFamily
// without clobbering any existing default style.
const TextWithDefaults = Text as unknown as {
  defaultProps?: { style?: unknown };
};
TextWithDefaults.defaultProps = {
  ...TextWithDefaults.defaultProps,
  style: [
    { fontFamily: 'NunitoSans_400Regular' },
    TextWithDefaults.defaultProps?.style,
  ],
};

/** Shared options applied to every detail/form screen that gets a native header.
 *  - headerBackButtonDisplayMode:'minimal' → iOS shows only the chevron, no
 *    label (HIG recommendation for deeper stacks; avoids long dynamic titles
 *    appearing in the back button of a subsequent push).
 *  - headerTintColor: accent orange for the interactive back chevron/button.
 *  - headerStyle / headerTitleStyle: neutral chrome so only interactive items
 *    carry the accent — not the title itself. */
const DETAIL_SCREEN_OPTIONS = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text },
} as const;

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  // Brand font (Nunito Sans). The real per-weight faces are required because
  // RN — notably Android — will NOT synthesize the correct cut from a single
  // family + fontWeight; each weight needs its own face name. The weight
  // utilities (font-normal/medium/semibold/bold/extrabold) are mapped to these
  // faces in global.css. Loaded at runtime via JS-imported faces + useFonts —
  // no native rebuild needed.
  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    void authStore.getState().restore();
  }, []);

  // Keep the splash spinner up until both the brand font and the persisted
  // session are ready, so text never flashes in the system font first.
  const content =
    !fontsLoaded || status === 'loading' ? (
      <View className="flex-1 items-center justify-center bg-z-bg">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    ) : (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          {/* Detail / form screens — native header with back + swipe-back.
              Dynamic titles (asset/[id], group/[id]) are set inside the screen
              component via <Stack.Screen options={{ title }} /> once data loads. */}
          <Stack.Screen name="asset/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/[id]/preferences" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="group/create" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="availability" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="notifications" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="reports" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="select/[field]" options={DETAIL_SCREEN_OPTIONS} />
          <Stack.Screen name="invite" options={DETAIL_SCREEN_OPTIONS} />
          {/* Modal screens — formSheet gives native grab-bar + detents on iOS
              (UISheetPresentationController) and a bottom sheet on Android.
              headerShown:true lets the screen set its own title + cancel
              button via <Stack.Screen options={...}> inside the component.
              upload: full height (media picker needs room); single detent '1.0'
                so the sheet always expands — no half-sheet for a multi-step wizard
                that embeds a video picker.
              book: half-or-full fluid detents so the user can see the coaching
                calendar below when the sheet is partially open (UX improvement
                over a full-screen push). */}
          <Stack.Screen
            name="upload"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.bg },
              headerTitleStyle: { color: colors.text },
              sheetAllowedDetents: [1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 16,
            }}
          />
          <Stack.Screen
            name="book"
            options={{
              presentation: 'formSheet',
              headerShown: true,
              headerBackButtonDisplayMode: 'minimal' as const,
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.bg },
              headerTitleStyle: { color: colors.text },
              sheetAllowedDetents: [0.5, 1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 16,
            }}
          />
          {/* Full-screen live call — keeps its own chrome, no nav header. */}
          <Stack.Screen name="call/[bookingId]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    );

  return (
    <QueryClientProvider client={queryClient}>
      {content}
      <ZToastHost />
    </QueryClientProvider>
  );
}
