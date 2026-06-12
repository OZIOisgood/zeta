import { useRef, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, Users } from 'lucide-react-native';
import {
  useInvitationInfoQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../api/queries/invitations';
import { ZButton } from '../components/ui/z-button';
import { ZIconButton } from '../components/ui/z-icon-button';
import { ZScreen } from '../components/ui/z-screen';
import { ZSkeleton } from '../components/ui/z-skeleton';
import { ZTextInput } from '../components/ui/z-text-input';
import { parseInviteCode } from '../lib/invite-code';
import { avatarSrc } from '../lib/avatar';
import { colors } from '../theme/colors';

export default function InviteScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [manualInputError, setManualInputError] = useState(false);
  const manualInputRef = useRef('');
  const scannedRef = useRef(false);

  const infoQuery = useInvitationInfoQuery(code);
  const acceptMutation = useAcceptInvitationMutation();
  const declineMutation = useDeclineInvitationMutation();

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedRef.current) return;
    const parsed = parseInviteCode(data);
    if (!parsed) return;
    scannedRef.current = true;
    setCode(parsed);
  }

  function handleManualSubmit() {
    const current = manualInputRef.current;
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
    manualInputRef.current = '';
    scannedRef.current = false;
  }

  async function handleAccept() {
    const result = await acceptMutation.mutateAsync({ code });
    router.replace(`/group/${result.group_id}`);
  }

  async function handleDecline() {
    await declineMutation.mutateAsync({ code });
    router.back();
  }

  const info = infoQuery.data;
  const isConfirmPhase = code !== '';

  return (
    <ZScreen>
      <ScrollView className="flex-1 bg-z-bg" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-4 flex-row items-center gap-3">
          <ZIconButton label="Back" onPress={() => router.back()}>
            <ArrowLeft color={colors.muted} size={24} />
          </ZIconButton>
          <Text className="text-lg font-semibold text-z-text">Join a group</Text>
        </View>

        {/* Capture phase */}
        {!isConfirmPhase && (
          <>
            {/* Camera or permission prompt */}
            {permission?.granted ? (
              <View className="mb-4 overflow-hidden rounded-xl" style={{ height: 280 }}>
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              </View>
            ) : (
              <View className="mb-4 items-center gap-3 rounded-xl border border-z-border bg-z-surface p-6">
                <Text className="text-center text-sm text-z-muted">
                  Camera access is needed to scan a QR code.
                </Text>
                <ZButton
                  label="Grant camera access"
                  variant="secondary"
                  onPress={() => void requestPermission()}
                />
              </View>
            )}

            {/* Divider */}
            <View className="my-4 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-z-border" />
              <Text className="text-sm text-z-muted">or enter code manually</Text>
              <View className="h-px flex-1 bg-z-border" />
            </View>

            {/* Manual entry */}
            <ZTextInput
              testID="invite-code-input"
              accessibilityLabel="Invite code"
              value={manualInput}
              onChangeText={(v) => {
                manualInputRef.current = v;
                setManualInput(v);
                if (manualInputError) setManualInputError(false);
              }}
              placeholder="e.g. ABC123"
              invalid={manualInputError}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleManualSubmit}
            />
            {manualInputError && (
              <Text
                testID="invite-code-error"
                className="mt-1 text-sm text-z-danger"
              >
                Enter the 6-character code from the invitation.
              </Text>
            )}
            <View className="mt-3">
              <ZButton
                testID="invite-code-submit"
                label="Look up code"
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
              <View className="gap-3 rounded-xl border border-z-border bg-z-surface p-4">
                <View className="flex-row items-center gap-3">
                  <ZSkeleton className="h-12 w-12 rounded-md" />
                  <View className="flex-1 gap-2">
                    <ZSkeleton className="h-4 w-3/5" />
                    <ZSkeleton className="h-3 w-2/5" />
                  </View>
                </View>
              </View>
            )}

            {infoQuery.isError && (
              <View className="gap-4">
                <Text className="text-center text-z-danger">
                  Invitation code not found or expired.
                </Text>
                <ZButton
                  testID="invite-reset"
                  label="Try a different code"
                  variant="secondary"
                  onPress={handleReset}
                />
              </View>
            )}

            {info && (
              <View className="gap-4">
                {/* Group card */}
                <View className="flex-row items-center gap-3 rounded-xl border border-z-border bg-z-surface p-4">
                  {info.group_avatar ? (
                    <Image
                      source={{ uri: avatarSrc(info.group_avatar) }}
                      className="h-12 w-12 rounded-md"
                    />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded-md bg-z-surface-warm">
                      <Users color={colors.muted} size={24} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-z-text">{info.group_name}</Text>
                  </View>
                </View>

                {/* Mutation error */}
                {(acceptMutation.isError || declineMutation.isError) && (
                  <Text className="text-sm text-z-danger">
                    Something went wrong. Please try again.
                  </Text>
                )}

                {info.already_member ? (
                  <>
                    <Text className="text-center text-sm text-z-muted">
                      You are already a member of this group.
                    </Text>
                    <ZButton
                      testID="invite-open-group"
                      label="Open group"
                      onPress={() => router.replace(`/group/${info.group_id}`)}
                    />
                  </>
                ) : (
                  <>
                    <ZButton
                      testID="invite-accept"
                      label="Join group"
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      onPress={() => void handleAccept()}
                    />
                    <ZButton
                      testID="invite-decline"
                      label="Decline"
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
    </ZScreen>
  );
}
