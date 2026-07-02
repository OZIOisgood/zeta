import { useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import {
  useInvitationInfoQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../api/queries/invitations';
import { ZAvatar } from '../components/ui/z-avatar';
import { ZButton } from '../components/ui/z-button';
import { ZCard } from '../components/ui/z-card';
import { ZDivider } from '../components/ui/z-divider';
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTextInput } from '../components/ui/z-text-input';
import { showToast } from '../components/ui/z-toast';
import { initialsFromName } from '../lib/avatar';
import { parseInviteCode } from '../lib/invite-code';

export default function InviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  // Seed `code` from the deep-link param (e.g. /invite?code=aB3xZ9 from a
  // notification row tap) so the confirm phase + useInvitationInfoQuery auto-load.
  // parseInviteCode validates format; an empty/invalid param starts in capture phase.
  const [code, setCode] = useState(() => parseInviteCode(params.code ?? ''));
  const [manualInput, setManualInput] = useState('');
  const [manualInputError, setManualInputError] = useState(false);
  const scannedRef = useRef(false);

  const infoQuery = useInvitationInfoQuery(code);
  const acceptMutation = useAcceptInvitationMutation();
  const declineMutation = useDeclineInvitationMutation();

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedRef.current) return;
    const parsed = parseInviteCode(data);
    if (!parsed) return;
    scannedRef.current = true;
    AccessibilityInfo.announceForAccessibility(t('groups.invitationDialog.title'));
    setCode(parsed);
  }

  function handleManualSubmit() {
    const current = manualInput;
    const parsed = parseInviteCode(current);
    if (!parsed) {
      setManualInputError(true);
      return;
    }
    setManualInputError(false);
    setCode(parsed);
  }

  function handleReset() {
    setCode('');
    setManualInput('');
    setManualInputError(false);
    scannedRef.current = false;
  }

  async function handleAccept() {
    try {
      const result = await acceptMutation.mutateAsync({ code });
      showToast(
        t('groups.invitationDialog.title'),
        t('groups.invitationDialog.joined', { group: info?.group_name ?? '' }),
        'success',
      );
      router.replace(`/group/${result.group_id}`);
    } catch {
      showToast(
        t('groups.invitationDialog.title'),
        t('groups.invitationDialog.joinFailed'),
        'error',
      );
    }
  }

  async function handleDecline() {
    try {
      await declineMutation.mutateAsync({ code });
      router.back();
    } catch {
      showToast(
        t('groups.invitationDialog.title'),
        t('groups.invite.genericError'),
        'error',
      );
    }
  }

  const info = infoQuery.data;
  const isConfirmPhase = code !== '';

  return (
    <ZScreen edges={['bottom']}>
      <Stack.Screen options={{ title: t('home.firstSteps.joinGroup') }} />
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Capture phase */}
          {!isConfirmPhase && (
            <>
              {/* Camera or permission prompt */}
              {permission?.granted ? (
                <View
                  accessible
                  accessibilityLabel={`${t('common.labels.camera')}. ${t('groups.invite.cameraHint')}`}
                  className="mb-4 overflow-hidden"
                  style={{ height: 280, borderRadius: 20 }}
                >
                  <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                </View>
              ) : (
                // Inner View holds the centering/gap — ZCard's className lands on
                // the OUTER wrapper on Android, so `items-center` there would size
                // the card to content (narrower than the full-width invite card).
                <ZCard className="mb-4">
                  <View className="gap-3">
                    <Text className="text-center text-[15px] text-z-muted">
                      {t('groups.invite.cameraHint')}
                    </Text>
                    <ZButton
                      label={t('groups.invite.grantCamera')}
                      variant="tonal"
                      fullWidth
                      onPress={() => void requestPermission()}
                    />
                  </View>
                </ZCard>
              )}

              {/* "or enter manually" labeled divider — rules flank the label,
                  vertically centered (ZDivider's baked-in alignSelf:'stretch' is
                  overridden to 'center' so the rules sit on the text's centerline
                  instead of the top of the row). */}
              <View className="my-4 flex-row items-center gap-3">
                <ZDivider className="flex-1" style={{ alignSelf: 'center' }} />
                <Text className="text-sm text-z-muted">{t('groups.invite.manualDivider')}</Text>
                <ZDivider className="flex-1" style={{ alignSelf: 'center' }} />
              </View>

              {/* Manual entry — labeled, full-width input + CTA inside a card. */}
              <ZCard>
                <ZFieldLabel label={t('groups.invite.codeLabel')} />
                <View className="mt-2">
                  <ZTextInput
                    testID="invite-code-input"
                    accessibilityLabel={t('groups.invite.codeLabel')}
                    value={manualInput}
                    onChangeText={(v) => {
                      setManualInput(v);
                      if (manualInputError) setManualInputError(false);
                    }}
                    placeholder={t('groups.invite.codePlaceholder')}
                    invalid={manualInputError}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleManualSubmit}
                  />
                </View>
                {manualInputError && (
                  <View className="mt-2">
                    <ZFieldError
                      testID="invite-code-error"
                      message={t('groups.invite.codeInvalid')}
                    />
                  </View>
                )}
                <View className="mt-3">
                  <ZButton
                    testID="invite-code-submit"
                    label={t('groups.invite.lookUp')}
                    fullWidth
                    disabled={manualInput.trim().length === 0}
                    onPress={handleManualSubmit}
                  />
                </View>
              </ZCard>
            </>
          )}

          {/* Confirm phase */}
          {isConfirmPhase && (
            <>
              {infoQuery.isPending && (
                <ZCard>
                  <View className="flex-row items-center gap-3">
                    <ZSkeleton className="h-12 w-12 rounded-md" />
                    <View className="flex-1 gap-2">
                      <ZSkeleton className="h-4 w-3/5" />
                      <ZSkeleton className="h-3 w-2/5" />
                    </View>
                  </View>
                </ZCard>
              )}

              {infoQuery.isError && (
                <ZEmptyState
                  title={t('groups.invite.notFound')}
                  description={t('groups.invite.tryDifferent')}
                >
                  {/* Retry REFETCHES the same code first — a network blip must
                      not force the user to discard a valid code (reset stays
                      available as the secondary path). */}
                  <View className="gap-2">
                    <ZButton
                      testID="invite-retry"
                      label={t('common.actions.retry')}
                      variant="tonal"
                      onPress={() => void infoQuery.refetch()}
                    />
                    <ZButton
                      testID="invite-reset"
                      label={t('common.actions.back')}
                      variant="ghost"
                      onPress={handleReset}
                    />
                  </View>
                </ZEmptyState>
              )}

              {info && (
                <View className="gap-4">
                  {/* Invitation headline */}
                  <Text className="text-center text-[15px] text-z-muted">
                    {t('groups.invitationDialog.invited', { group: info.group_name })}
                  </Text>

                  {/* Group card */}
                  <ZCard>
                    <View className="flex-row items-center gap-3">
                      <ZAvatar
                        image={info.group_avatar || undefined}
                        fallback={initialsFromName(info.group_name, 'G')}
                        size={48}
                        alt={info.group_name}
                      />
                      <View className="flex-1">
                        <Text className="text-base font-bold text-z-text">
                          {info.group_name}
                        </Text>
                      </View>
                    </View>
                  </ZCard>

                  {/* Mutation error */}
                  {(acceptMutation.isError || declineMutation.isError) && (
                    <ZFieldError message={t('groups.invite.genericError')} />
                  )}

                  {info.already_member ? (
                    <View className="gap-3">
                      <Text className="text-center text-[15px] text-z-muted">
                        {t('groups.invitationDialog.alreadyMember', { group: info.group_name })}
                      </Text>
                      <ZButton
                        testID="invite-open-group"
                        label={t('groups.invite.openGroup')}
                        fullWidth
                        onPress={() => router.replace(`/group/${info.group_id}`)}
                      />
                    </View>
                  ) : (
                    <View className="gap-3">
                      <ZButton
                        testID="invite-accept"
                        label={t('groups.invitationDialog.joinGroup')}
                        fullWidth
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onPress={() => void handleAccept()}
                      />
                      <ZButton
                        testID="invite-decline"
                        label={t('common.actions.decline')}
                        variant="ghost"
                        fullWidth
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onPress={() => void handleDecline()}
                      />
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
