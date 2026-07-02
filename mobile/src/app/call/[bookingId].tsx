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
import { Linking, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { callStore, useCall, type CallErrorCode } from '../../call/call-store';
import { CallVideo } from '../../call/call-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZButton } from '../../components/ui/z-button';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { ZSymbol } from '../../components/ui/z-symbol';
import { colors } from '../../theme/colors';

// Maps a stable store error code to a localized message key. The raw provider
// message never reaches the UI (it may carry connection details).
const ERROR_MESSAGE_KEY: Record<CallErrorCode, string> = {
  connect: 'sessions.call.connectFailed',
  join: 'sessions.call.joinFailed',
  engine: 'sessions.call.connectFailed',
};

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

  // Mirrors the web ngOnInit guard: a missing route param means we have nothing
  // to join, so we render the error state and never attempt a join.
  const missingBooking = !bookingId || !groupId;

  useEffect(() => {
    if (missingBooking) return;
    if (!bothGranted) return;
    if (joinedRef.current) return;
    joinedRef.current = true;
    void callStore.getState().join(groupId ?? '', bookingId ?? '');
  }, [missingBooking, bothGranted, groupId, bookingId]);

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

  // ── Missing booking guard ────────────────────────────────────────────────────
  // Mirrors the web ngOnInit guard: without both route params there is nothing to
  // join, so we surface the error state and skip the join entirely.
  if (missingBooking) {
    return (
      <ZScreen edges={['top', 'bottom']}>
        <View testID="call-error" className="flex-1 items-center justify-center px-8">
          <ZEmptyState
            icon={<ZSymbol name="warning" label={t('sessions.call.couldNotJoin')} size={24} color={colors.danger} />}
            title={t('sessions.call.couldNotJoin')}
            description={t('sessions.call.missingBooking')}
          >
            <ZButton
              testID="call-back"
              label={t('sessions.call.backToSessions')}
              variant="ghost"
              onPress={() => router.back()}
            />
          </ZEmptyState>
        </View>
      </ZScreen>
    );
  }

  // ── Permission denied state ──────────────────────────────────────────────────
  if (!cameraGranted || !micGranted) {
    return (
      <ZScreen edges={['top', 'bottom']}>
        <View testID="call-permission-denied" className="flex-1 items-center justify-center px-8">
          <ZEmptyState
            icon={<ZSymbol name="camera-off" label={t('sessions.call.permissionHeading')} size={24} color={colors.danger} />}
            title={t('sessions.call.permissionHeading')}
            description={t('sessions.call.permissionBody')}
          >
            <View className="gap-2">
              {/* canAskAgain === false ⇒ the OS suppresses the dialog and the
                  request resolves silently — a dead-end button. Route to the
                  system settings instead, which is the only remaining path. */}
              {!cameraGranted ? (
                <ZButton
                  label={t('sessions.call.grantCamera')}
                  variant="primary"
                  onPress={() =>
                    cameraPermission?.canAskAgain === false
                      ? void Linking.openSettings()
                      : void requestCameraPermission()
                  }
                />
              ) : null}
              {!micGranted ? (
                <ZButton
                  label={t('sessions.call.grantMicrophone')}
                  // Avoid two stacked primaries: when both are denied the camera
                  // grant is the single primary CTA and the mic grant is secondary.
                  variant={cameraGranted ? 'primary' : 'secondary'}
                  onPress={() =>
                    micPermission?.canAskAgain === false
                      ? void Linking.openSettings()
                      : void requestMicPermission()
                  }
                />
              ) : null}
              <ZButton
                testID="call-back"
                label={t('sessions.call.backToSessions')}
                variant="ghost"
                onPress={() => router.back()}
              />
            </View>
          </ZEmptyState>
        </View>
      </ZScreen>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (phase === 'error') {
    const messageKey = error ? ERROR_MESSAGE_KEY[error] : 'sessions.call.connectFailed';
    return (
      <ZScreen edges={['top', 'bottom']}>
        <View testID="call-error" className="flex-1 items-center justify-center px-8">
          <ZEmptyState
            icon={<ZSymbol name="warning" label={t('sessions.call.couldNotJoin')} size={24} color={colors.danger} />}
            title={t('sessions.call.couldNotJoin')}
            description={t(messageKey)}
          >
            <View className="gap-2">
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
          </ZEmptyState>
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
            <ZSymbol name="mic-off" label={t('common.aria.toggleMicrophone')} size={24} color={colors.danger} />
          ) : (
            <ZSymbol name="mic" label={t('common.aria.toggleMicrophone')} size={24} color={colors.onPrimary} />
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
            <ZSymbol name="video" label={t('common.aria.toggleCamera')} size={24} color={colors.onPrimary} />
          ) : (
            <ZSymbol name="video-off" label={t('common.aria.toggleCamera')} size={24} color={colors.danger} />
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
          <ZSymbol name="camera-switch" label={t('sessions.call.switchCamera')} size={24} color={colors.onPrimary} />
        </ZIconButton>

        <ZIconButton
          testID="call-leave"
          label={t('common.aria.leaveCall')}
          variant="primary"
          size="lg"
          shape="circle"
          onPress={handleLeave}
        >
          <ZSymbol name="phone-off" label={t('common.aria.leaveCall')} size={24} color={colors.onPrimary} />
        </ZIconButton>
      </View>
    </ZScreen>
  );
}
