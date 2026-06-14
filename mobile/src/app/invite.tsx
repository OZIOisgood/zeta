import { useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { ZEmptyState } from '../components/ui/z-empty-state';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZSymbol } from '../components/ui/z-symbol';
import { ZTextInput } from '../components/ui/z-text-input';
import { showToast } from '../components/ui/z-toast';
import { initialsFromName } from '../lib/avatar';
import { parseInviteCode } from '../lib/invite-code';
import { colors } from '../theme/colors';

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
    <ZScreen>
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-4 flex-row items-center gap-3">
            <ZIconButton label={t('common.actions.back')} onPress={() => router.back()}>
              <ZSymbol name="back" label={t('common.actions.back')} size={24} color={colors.muted} />
            </ZIconButton>
            <Text className="text-lg font-semibold text-z-text">
              {t('home.firstSteps.joinGroup')}
            </Text>
          </View>

          {/* Capture phase */}
          {!isConfirmPhase && (
            <>
              {/* Camera or permission prompt */}
              {permission?.granted ? (
                <View
                  accessible
                  accessibilityLabel={`${t('common.labels.camera')}. ${t('groups.invite.cameraHint')}`}
                  className="mb-4 overflow-hidden rounded-xl"
                  style={{ height: 280 }}
                >
                  <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                </View>
              ) : (
                <ZCard className="mb-4 items-center gap-3">
                  <Text className="text-center text-sm text-z-muted">
                    {t('groups.invite.cameraHint')}
                  </Text>
                  <ZButton
                    label={t('groups.invite.grantCamera')}
                    variant="secondary"
                    onPress={() => void requestPermission()}
                  />
                </ZCard>
              )}

              {/* Divider */}
              <View className="my-4 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-z-border" />
                <Text className="text-sm text-z-muted">{t('groups.invite.manualDivider')}</Text>
                <View className="h-px flex-1 bg-z-border" />
              </View>

              {/* Manual entry */}
              <ZTextInput
                testID="invite-code-input"
                accessibilityLabel={t('groups.invite.codePlaceholder')}
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
              {manualInputError && (
                <ZFieldError
                  testID="invite-code-error"
                  message={t('groups.invite.codeInvalid')}
                />
              )}
              <View className="mt-3">
                <ZButton
                  testID="invite-code-submit"
                  label={t('groups.invite.lookUp')}
                  disabled={manualInput.trim().length === 0}
                  onPress={handleManualSubmit}
                />
              </View>
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
                  <ZButton
                    testID="invite-reset"
                    label={t('common.actions.retry')}
                    variant="secondary"
                    onPress={handleReset}
                  />
                </ZEmptyState>
              )}

              {info && (
                <View className="gap-4">
                  {/* Invitation headline */}
                  <Text className="text-center text-sm text-z-muted">
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
                        <Text className="text-base font-semibold text-z-text">
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
                    <>
                      <Text className="text-center text-sm text-z-muted">
                        {t('groups.invitationDialog.alreadyMember', { group: info.group_name })}
                      </Text>
                      <ZButton
                        testID="invite-open-group"
                        label={t('groups.invite.openGroup')}
                        onPress={() => router.replace(`/group/${info.group_id}`)}
                      />
                    </>
                  ) : (
                    <>
                      <ZButton
                        testID="invite-accept"
                        label={t('groups.invitationDialog.joinGroup')}
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onPress={() => void handleAccept()}
                      />
                      <ZButton
                        testID="invite-decline"
                        label={t('common.actions.decline')}
                        variant="ghost"
                        disabled={acceptMutation.isPending || declineMutation.isPending}
                        onPress={() => void handleDecline()}
                      />
                    </>
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
