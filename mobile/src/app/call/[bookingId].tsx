/**
 * Full-screen live call screen.
 *
 * Route: /call/[bookingId]?groupId=<groupId>
 *
 * This screen is intentionally edge-to-edge on the top edge so the video
 * fills the full display. It deviates from the "every screen uses ZScreen
 * with top inset" rule by using `edges={['bottom']}` only — the call UI
 * intentionally bleeds under the status bar for a full-bleed video experience.
 * (See AGENTS.md: "intentionally edge-to-edge areas opt out per edge".)
 *
 * Back-handling approach: leaving the screen (hardware back, gesture, or the
 * explicit leave button) always triggers leave() via the useEffect cleanup.
 * An explicit BackHandler is therefore unnecessary — unmounting the screen
 * is the single teardown path.
 */
import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Mic, MicOff, Video, VideoOff, SwitchCamera, PhoneOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { callStore, useCall } from '../../call/call-store';
import { CallVideo } from '../../call/call-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZButton } from '../../components/ui/z-button';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { colors } from '../../theme/colors';

export default function CallScreen() {
  const { bookingId, groupId } = useLocalSearchParams<{ bookingId: string; groupId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const phase = useCall((s) => s.phase);
  const remoteUid = useCall((s) => s.remoteUid);
  const micMuted = useCall((s) => s.micMuted);
  const cameraEnabled = useCall((s) => s.cameraEnabled);
  const error = useCall((s) => s.error);

  // Guard: only join once per mount
  const joinedRef = useRef(false);

  const cameraGranted = cameraPermission?.granted ?? false;
  const micGranted = micPermission?.granted ?? false;
  const bothGranted = cameraGranted && micGranted;

  useEffect(() => {
    if (!bothGranted) return;
    if (joinedRef.current) return;
    joinedRef.current = true;
    void callStore.getState().join(groupId ?? '', bookingId ?? '');
  }, [bothGranted, groupId, bookingId]);

  // Teardown on unmount — covers hardware back, gesture dismiss, and explicit leave.
  useEffect(() => {
    return () => {
      void callStore.getState().leave(groupId ?? '', bookingId ?? '');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLeave() {
    // Do NOT call leave() here — the useEffect cleanup on unmount is the single
    // teardown path (see file comment above). Calling back() triggers unmount.
    router.back();
  }

  // ── Permission denied state ──────────────────────────────────────────────────
  if (!cameraGranted || !micGranted) {
    return (
      <ZScreen edges={['top', 'bottom']}>
        <View testID="call-permission-denied" className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-base font-semibold text-z-text">
            {t('sessions.call.permissionHeading')}
          </Text>
          <Text className="text-center text-sm text-z-muted">
            {t('sessions.call.permissionBody')}
          </Text>
          {!cameraGranted ? (
            <ZButton
              label={t('sessions.call.grantCamera')}
              variant="primary"
              onPress={() => void requestCameraPermission()}
            />
          ) : null}
          {!micGranted ? (
            <ZButton
              label={t('sessions.call.grantMicrophone')}
              variant="primary"
              onPress={() => void requestMicPermission()}
            />
          ) : null}
          <ZButton
            testID="call-back"
            label={t('sessions.call.backToSessions')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </ZScreen>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <ZScreen edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-base font-semibold text-z-text">
            {error ?? t('sessions.call.connectFailed')}
          </Text>
          <ZButton
            label={t('common.actions.retry')}
            variant="primary"
            onPress={() => {
              joinedRef.current = false;
              void callStore.getState().join(groupId ?? '', bookingId ?? '');
            }}
          />
          <ZButton
            testID="call-back"
            label={t('sessions.call.backToSessions')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </ZScreen>
    );
  }

  // ── Connecting state (skeleton) ──────────────────────────────────────────────
  if (phase === 'connecting' || phase === 'idle') {
    return (
      // Edge-to-edge: no top inset for full-bleed dark call UI
      <ZScreen edges={['bottom']} className="bg-black">
        <View testID="call-connecting" className="flex-1 items-center justify-center gap-4 px-8">
          <ZSkeleton className="h-6 w-48" />
          <ZSkeleton className="h-4 w-64" />
          <ZSkeleton className="h-4 w-40" />
          <Text className="mt-4 text-sm text-gray-400">
            {t('sessions.call.connecting')}
          </Text>
        </View>
      </ZScreen>
    );
  }

  // ── In-call state ────────────────────────────────────────────────────────────
  return (
    // Edge-to-edge top: full-bleed video. Bottom inset applied for controls.
    <ZScreen edges={['bottom']} className="bg-black">
      {/* Full-bleed video */}
      <CallVideo remoteUid={remoteUid} localPreview={cameraEnabled} />

      {/* Waiting overlay when remote not yet joined */}
      {remoteUid === null ? (
        <View
          testID="call-waiting"
          className="absolute inset-0 items-center justify-center bg-black/60 px-8"
        >
          <Text className="text-center text-base text-white">
            {t('sessions.call.waiting')}
          </Text>
        </View>
      ) : null}

      {/* Bottom controls bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center gap-4 pb-6 pt-4">
        <ZIconButton
          testID="call-mic"
          label={t('common.aria.toggleMicrophone')}
          variant="secondary"
          size="lg"
          shape="circle"
          onPress={() => callStore.getState().toggleMic()}
        >
          {micMuted ? (
            <MicOff color={colors.danger} size={24} />
          ) : (
            <Mic color={colors.text} size={24} />
          )}
        </ZIconButton>

        <ZIconButton
          testID="call-camera"
          label={t('common.aria.toggleCamera')}
          variant="secondary"
          size="lg"
          shape="circle"
          onPress={() => callStore.getState().toggleCamera()}
        >
          {cameraEnabled ? (
            <Video color={colors.text} size={24} />
          ) : (
            <VideoOff color={colors.danger} size={24} />
          )}
        </ZIconButton>

        <ZIconButton
          testID="call-switch"
          label={t('sessions.call.switchCamera')}
          variant="secondary"
          size="lg"
          shape="circle"
          onPress={() => callStore.getState().switchCamera()}
        >
          <SwitchCamera color={colors.text} size={24} />
        </ZIconButton>

        <ZIconButton
          testID="call-leave"
          label={t('common.aria.leaveCall')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={handleLeave}
        >
          <PhoneOff color={colors.onPrimary} size={24} />
        </ZIconButton>
      </View>
    </ZScreen>
  );
}
