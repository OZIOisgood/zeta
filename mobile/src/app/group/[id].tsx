import { useRef, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import QRCodeSvg from 'react-native-qrcode-svg';
import {
  useGroupQuery,
  useGroupStudentsQuery,
  useGroupExpertsQuery,
  useLeaveGroupMutation,
  useRemoveGroupMemberMutation,
  type GroupUser,
} from '../../api/queries/groups';
import { useCreateInvitationMutation } from '../../api/queries/invitations';
import { useAuth } from '../../auth/auth-store';
import { initialsFromName } from '../../lib/avatar';
import { MemberRow } from '../../components/member-row';
import { Touchable } from '../../components/ui/touchable';
import { ZAvatar } from '../../components/ui/z-avatar';
import { ZBadge } from '../../components/ui/z-badge';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { ZDivider } from '../../components/ui/z-divider';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZFieldError } from '../../components/ui/z-field-error';
import { ZFieldLabel } from '../../components/ui/z-field-label';
import { ZIconTile } from '../../components/ui/z-icon-tile';
import { ZKeyboardAvoidingView } from '../../components/ui/z-keyboard-avoiding-view';
import { ZQueryError } from '../../components/ui/z-query-error';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { showToast } from '../../components/ui/z-toast';
import { ZTextInput } from '../../components/ui/z-text-input';
import { ZSymbol } from '../../components/ui/z-symbol';
import { colors } from '../../theme/colors';
import { useRoleColors } from '../../theme/native';

/** Web invite base URL: produce the same link the web app generates so a QR
 *  scanned by a system camera opens the web invitation page. Falls back to
 *  localhost for local development. */
const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:4200';
if (!process.env.EXPO_PUBLIC_WEB_BASE_URL) {
  // Loud, not silent: a build without the env var mints localhost invite
  // links/QR codes that are dead for every recipient (mirrors login.ts's
  // client-id warning). Warn in release too — that is where it hurts.
  console.warn('EXPO_PUBLIC_WEB_BASE_URL is not set — invite links/QR codes will point at localhost.');
}

function buildInviteLink(code: string) {
  return `${WEB_BASE}/groups?invite=${code}`;
}

function MembersSkeleton() {
  return (
    <View className="mt-5 gap-3">
      <ZSkeleton className="h-14 w-full" />
      <ZSkeleton className="h-14 w-full" />
    </View>
  );
}

function MemberDivider() {
  // Leading-aligned separator: starts under the title, past the 44dp avatar
  // (12 row pad + 44 avatar + 12 gap = 68dp). Matches the M3 inset-list look
  // (was full-bleed).
  return <ZDivider inset={68} />;
}

function MemberSection({
  kind,
  title,
  description,
  members,
  isLoading,
  isError,
  onRetry,
  onRemoveMember,
  currentUserId,
}: {
  kind: 'experts' | 'students';
  title: string;
  description: string;
  members: GroupUser[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** When provided, renders a perm-gated remove button on each row.
   *  The button is hidden for the row whose id matches currentUserId
   *  (mirrors web group-details-page.component.ts:218 — !isCurrentUser). */
  onRemoveMember?: (member: GroupUser) => void;
  /** The signed-in user's id — used to hide the remove button on own row. */
  currentUserId?: string | null;
}) {
  const { t } = useTranslation();
  const count = members?.length ?? 0;
  const iconName = kind === 'experts' ? 'award' : 'users';
  const emptyTitle = kind === 'experts' ? t('groups.noExperts') : t('groups.noStudents');
  const emptyDescription =
    kind === 'experts' ? t('groups.noExpertsDescription') : t('groups.inviteStudents');

  return (
    <ZCard>
      <View className="flex-row items-start gap-3">
        <ZIconTile tone="neutral" icon={<ZSymbol name={iconName} label={title} size={20} color={colors.primary} />} />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[19px] font-extrabold text-z-text">{title}</Text>
            <ZBadge label={String(count)} tone="neutral" />
          </View>
          <Text className="mt-1 text-[15px] leading-6 text-z-muted">{description}</Text>
        </View>
      </View>

      {isLoading ? (
        <MembersSkeleton />
      ) : isError ? (
        <View className="mt-5">
          <ZEmptyState
            title={t('groups.membersLoadFailed')}
            description={t('home.error.description')}
            icon={<ZSymbol name="warning" label={t('groups.membersLoadFailed')} size={24} color={colors.primary} />}
          >
            <ZButton
              testID={`members-retry-${kind}`}
              label={t('common.actions.retry')}
              variant="tonal"
              onPress={onRetry}
            />
          </ZEmptyState>
        </View>
      ) : count > 0 ? (
        <View className="mt-5">
          <FlatList
            data={members}
            scrollEnabled={false}
            keyExtractor={(m) => m.id}
            ItemSeparatorComponent={MemberDivider}
            renderItem={({ item }) => (
              <MemberRow
                member={item}
                onRemove={
                  onRemoveMember && item.id !== currentUserId
                    ? () => onRemoveMember(item)
                    : undefined
                }
              />
            )}
          />
        </View>
      ) : (
        <View className="mt-5">
          <ZEmptyState title={emptyTitle} description={emptyDescription} icon={<ZSymbol name={iconName} label={emptyTitle} size={24} color={colors.primary} />} />
        </View>
      )}
    </ZCard>
  );
}

/**
 * Invite section — mirrors the web `group-invitation-dialog.component.ts`.
 *
 * Phase 1: optional-email form → create invitation
 * Phase 2: result view — client-side QR (react-native-qrcode-svg), share link,
 *          copy-to-clipboard, share/download QR (expo-sharing), Done button.
 *
 * Parity checklist (group-invitation-dialog.ts):
 * [x] Optional email field with validation
 * [x] Email hint copy
 * [x] Inline error on API failure
 * [x] Two-variant success toast: sent (email) vs linkCreated (link only)
 * [x] Client-side QR from invite code
 * [x] QR render failure fallback (qrUnavailable)
 * [x] Share link display
 * [x] Copy-to-clipboard
 * [x] Share/save QR (expo-sharing ≈ web downloadQr)
 * [x] Done button resets to form
 */
function InviteSection({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  // Role-token color for content sitting on a secondary-container fill, used by
  // the tonal copy-link / download-qr buttons' leading icons so they match the
  // on-secondary-container label color (Material-3 tonal button contract).
  const { color } = useRoleColors();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [invitation, setInvitation] = useState<{ id: string; code: string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const { mutateAsync: createInvitation, isPending } = useCreateInvitationMutation();

  // Simple email validation (empty is allowed — generates a link-only invite)
  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const inviteLink = invitation ? buildInviteLink(invitation.code) : '';

  async function handleCreate() {
    if (emailInvalid) {
      setEmailTouched(true);
      return;
    }
    setEmailTouched(false);
    setErrorBanner(null);
    const sentByEmail = email.trim().length > 0;
    try {
      const result = await createInvitation({ groupID: groupId, email: email.trim() || undefined });
      setInvitation(result);
      showToast(
        t('toast.successTitle'),
        sentByEmail ? t('groups.inviteDialog.sent') : t('groups.inviteDialog.linkCreated'),
        'success',
      );
    } catch {
      setErrorBanner(t('groups.inviteDialog.failed'));
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    showToast(
      t('toast.successTitle'),
      t('groups.inviteDialog.linkCopied'),
      'success',
    );
  }

  async function handleShareQr() {
    if (!qrRef.current) return;
    qrRef.current.toDataURL(async (data) => {
      try {
        const path = `${FileSystem.cacheDirectory}invitation-qr.png`;
        await FileSystem.writeAsStringAsync(path, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: t('groups.inviteDialog.qrAlt') });
        }
      } catch {
        // Sharing not available — silently ignore
      }
    });
  }

  function handleDone() {
    setInvitation(null);
    setEmail('');
    setEmailTouched(false);
    setErrorBanner(null);
    setQrError(false);
  }

  return (
    <ZCard testID="group-invite-section">
      {/* Header */}
      <View className="flex-row items-start gap-3">
        <ZIconTile tone="neutral" icon={<ZSymbol name="qr-code" label={t('groups.inviteDialog.title')} size={20} color={colors.primary} />} />
        <View className="flex-1">
          <Text className="text-[19px] font-extrabold text-z-text">
            {t('groups.inviteDialog.title')}
          </Text>
          <Text className="mt-1 text-[15px] leading-6 text-z-muted">
            {t('groups.inviteDialog.cardDescription')}
          </Text>
        </View>
      </View>

      {!invitation ? (
        /* Phase 1: Create form */
        <View className="mt-4 gap-3">
          <View>
            <ZFieldLabel label={t('common.fields.emailAddressOptional')} />
            <ZTextInput
              testID="group-invite-email"
              accessibilityLabel={t('common.fields.emailAddressOptional')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('groups.emailPlaceholder')}
              invalid={emailTouched && emailInvalid}
            />
            {emailTouched && emailInvalid && (
              <ZFieldError message={t('groups.inviteDialog.emailInvalid')} />
            )}
          </View>

          {/* Email hint */}
          <View className="flex-row items-start gap-2 rounded-md border border-z-border bg-z-bg p-3">
            <ZSymbol name="mail" label={t('groups.inviteDialog.emailHint')} size={16} color={colors.primary} />
            <Text className="flex-1 text-[15px] leading-6 text-z-muted">
              {t('groups.inviteDialog.emailHint')}
            </Text>
          </View>

          {/* Inline error banner on create failure — mirrors create-group form
              (create.tsx) and the web invitation dialog, which surface failures
              in-form rather than via a toast. */}
          {errorBanner && (
            <View
              testID="group-invite-error"
              className="rounded-md border border-z-danger bg-z-danger/10 p-3"
            >
              <Text className="text-[15px] text-z-danger">{errorBanner}</Text>
            </View>
          )}

          <View className="flex-row justify-end">
            <ZButton
              testID="group-invite-create-btn"
              label={isPending ? t('groups.inviteDialog.creating') : t('common.actions.createInvitation')}
              disabled={isPending || (emailTouched && emailInvalid)}
              onPress={() => void handleCreate()}
            />
          </View>
        </View>
      ) : (
        /* Phase 2: Result view */
        <View className="mt-4 gap-4">
          {/* QR + link panel */}
          <View className="gap-4 rounded-lg border border-z-border bg-z-bg p-4">
            {/* QR code — centered on a solid surface tile with handoff's 12dp
                rounding. The QR itself stays at 160px so it remains scannable
                (the handoff's 76px is a prototype placeholder, not adopted). */}
            <View className="items-center justify-center rounded-[12px] border border-z-border bg-z-surface p-4">
              {qrError ? (
                <View className="items-center p-3">
                  <ZSymbol name="qr-code" label={t('groups.inviteDialog.qrUnavailable')} size={32} color={colors.muted} />
                  <Text className="mt-2 text-center text-xs text-z-muted">
                    {t('groups.inviteDialog.qrUnavailable')}
                  </Text>
                </View>
              ) : (
                <QRCodeSvg
                  testID="qr-code"
                  value={inviteLink}
                  size={160}
                  getRef={(ref) => { qrRef.current = ref as typeof qrRef.current; }}
                  onError={() => setQrError(true)}
                />
              )}
            </View>

            {/* Share link */}
            <View>
              <View className="flex-row items-center gap-2">
                <ZSymbol name="link" label={t('groups.inviteDialog.shareLink')} size={16} color={colors.primary} />
                <Text className="text-sm font-semibold text-z-text">
                  {t('groups.inviteDialog.shareLink')}
                </Text>
              </View>
              <View className="mt-2 rounded-md border border-z-border bg-z-surface px-3 py-2">
                <Text className="text-xs text-z-muted" numberOfLines={2}>{inviteLink}</Text>
              </View>
              <Text className="mt-2 text-[15px] leading-6 text-z-muted">
                {t('groups.inviteDialog.shareHint')}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="gap-2">
            <ZButton
              testID="group-invite-copy-btn"
              label={t('common.actions.copyLink')}
              variant="tonal"
              icon={<ZSymbol name="copy" label={t('common.actions.copyLink')} size={16} color={color('onSecondaryContainer')} />}
              onPress={() => void handleCopyLink()}
            />
            {!qrError && (
              <ZButton
                testID="group-invite-share-qr-btn"
                label={t('common.actions.downloadQr')}
                variant="tonal"
                icon={<ZSymbol name="share" label={t('common.actions.downloadQr')} size={16} color={color('onSecondaryContainer')} />}
                onPress={() => void handleShareQr()}
              />
            )}
            <ZButton
              testID="group-invite-done-btn"
              label={t('common.actions.done')}
              onPress={handleDone}
            />
          </View>
        </View>
      )}
    </ZCard>
  );
}

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useGroupQuery(id ?? '');
  const { color } = useRoleColors();

  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const userId = useAuth((s) => s.user?.id ?? null);

  const canSeeExperts = permissions?.includes('groups:expert-list:read') ?? false;
  const canSeeStudents = permissions?.includes('groups:user-list:read') ?? false;
  const canLeave =
    (permissions?.includes('groups:membership:leave') ?? false) &&
    data !== undefined &&
    data.owner_id !== userId;
  const canInvite = permissions?.includes('groups:invites:create') ?? false;
  // Mirrors web canOpenPreferences = canEditPreferences || canLeave
  const canOpenPreferences =
    (permissions?.includes('groups:preferences:edit') ?? false) ||
    (permissions?.includes('groups:membership:leave') ?? false);
  const canRemoveMembers = permissions?.includes('groups:user-list:delete') ?? false;

  const {
    data: experts,
    isPending: expertsLoading,
    isError: expertsError,
    refetch: refetchExperts,
  } = useGroupExpertsQuery(id ?? '', canSeeExperts);
  const {
    data: students,
    isPending: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useGroupStudentsQuery(id ?? '', canSeeStudents);

  // Hero member count = members visible to the current user (sum of the two
  // permission-gated lists; mirrors the per-section count badges). The Group
  // object carries no server-side total, so we count loaded rows. While the
  // list(s) the user CAN read are still loading, show a skeleton rather than a
  // premature "0".
  const canSeeMembers = canSeeExperts || canSeeStudents;
  const memberCount = (experts?.length ?? 0) + (students?.length ?? 0);
  const memberCountLoading =
    (canSeeExperts && expertsLoading) || (canSeeStudents && studentsLoading);

  const { mutateAsync, isPending: leaveIsPending } = useLeaveGroupMutation(id ?? '');
  const { mutateAsync: removeMember, isPending: removeIsPending } =
    useRemoveGroupMemberMutation(id ?? '');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupUser | null>(null);

  async function handleConfirmLeave() {
    setShowLeaveConfirm(false);
    try {
      await mutateAsync();
      showToast(t('groups.leave.success', { group: data?.name ?? '' }), undefined, 'success');
      router.back();
    } catch {
      showToast(t('groups.leave.failed'), undefined, 'error');
    }
  }

  async function handleConfirmRemoveMember() {
    if (!memberToRemove) return;
    const member = memberToRemove;
    setMemberToRemove(null);
    try {
      await removeMember({ userId: member.id });
      const name = `${member.first_name} ${member.last_name}`.trim();
      showToast(t('toast.successTitle'), t('groups.users.removed', { name }), 'success');
    } catch {
      showToast(t('toast.errorTitle'), t('groups.users.removeFailed'), 'error');
    }
  }

  if (isPending) {
    return (
      <ZScreen edges={['bottom']} className="gap-4 p-4">
        <Stack.Screen options={{ title: t('groups.myGroups') }} />
        <ZSkeleton testID="group-detail-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen edges={['bottom']} className="items-center justify-center px-8">
        <Stack.Screen options={{ title: t('groups.myGroups') }} />
        <ZQueryError
          title={t('groups.phase4.detailFailed')}
          onRetry={() => void refetch()}
        />
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      {/* Dynamic native header: group name as title; settings in headerRight
          when the user has the preferences:edit or membership:leave permission. */}
      <Stack.Screen
        options={{
          title: data.name,
          headerRight: canOpenPreferences
            ? () => (
                <Touchable
                  testID="group-preferences-btn"
                  accessibilityLabel={t('groups.preferences')}
                  onPress={() => router.push(`/group/${id ?? ''}/preferences`)}
                  style={{ marginRight: 4 }}
                  haptic
                >
                  <ZSymbol
                    name="settings"
                    label={t('groups.preferences')}
                    size={22}
                    color={colors.primary}
                  />
                </Touchable>
              )
            : undefined,
        }}
      />
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group identity hero — avatar + name displayed prominently in the
              body (the native header title is the concise fallback for the
              OS-level chrome; the body hero gives the full group card feel). */}
          <View className="flex-row items-start gap-3 p-4">
            <ZAvatar
              image={data.avatar ?? undefined}
              fallback={initialsFromName(data.name)}
              alt={data.name}
              size={56}
            />
            <View className="flex-1">
              <Text className="text-xl font-extrabold tracking-tight text-z-text" numberOfLines={2}>
                {data.name}
              </Text>
              {canSeeMembers &&
                (memberCountLoading ? (
                  <ZSkeleton className="mt-1.5 h-4 w-24" />
                ) : (
                  <Text className="mt-1 text-[15px] text-z-muted">
                    {t('groups.memberCount', { count: memberCount })}
                  </Text>
                ))}
            </View>
          </View>

          <View className="px-4 pb-4">
            <Text className="text-[15px] text-z-muted">
              {data.description || t('groups.phase4.noDescription')}
            </Text>
          </View>

          <View className="gap-6 px-4">
            {/* Invite section (groups:invites:create gated) */}
            {canInvite && <InviteSection groupId={id ?? ''} />}

            {/* Member sections */}
            {canSeeExperts || canSeeStudents ? (
              <View className="gap-4">
                {canSeeExperts && (
                  <MemberSection
                    kind="experts"
                    title={t('groups.experts')}
                    description={t('groups.expertsDescription')}
                    members={experts}
                    isLoading={expertsLoading}
                    isError={expertsError}
                    onRetry={() => void refetchExperts()}
                    onRemoveMember={canRemoveMembers ? (m) => setMemberToRemove(m) : undefined}
                    currentUserId={userId}
                  />
                )}
                {canSeeStudents && (
                  <MemberSection
                    kind="students"
                    title={t('groups.students')}
                    description={t('groups.studentsDescription')}
                    members={students}
                    isLoading={studentsLoading}
                    isError={studentsError}
                    onRetry={() => void refetchStudents()}
                    onRemoveMember={canRemoveMembers ? (m) => setMemberToRemove(m) : undefined}
                    currentUserId={userId}
                  />
                )}
              </View>
            ) : (
              <ZEmptyState
                title={t('groups.membersUnavailable')}
                description={t('groups.membersUnavailableDescription')}
                icon={<ZSymbol name="warning" label={t('groups.membersUnavailable')} size={24} color={colors.primary} />}
              />
            )}

            {/* Danger zone */}
            {canLeave && (
              <View className="pt-4">
                <ZButton
                  testID="group-leave"
                  label={t('groups.leave.action')}
                  variant="danger-outline"
                  fullWidth
                  icon={<ZSymbol name="logout" label="" size={18} color={color('danger')} />}
                  onPress={() => setShowLeaveConfirm(true)}
                />
                <ZConfirmDialog
                  testID="group-leave-dialog"
                  visible={showLeaveConfirm}
                  tone="danger"
                  title={t('groups.leave.title')}
                  description={t('groups.leave.confirm', { group: data.name })}
                  confirmLabel={t('groups.leave.action')}
                  cancelLabel={t('common.actions.cancel')}
                  confirmDisabled={leaveIsPending}
                  onConfirm={() => void handleConfirmLeave()}
                  onCancel={() => setShowLeaveConfirm(false)}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </ZKeyboardAvoidingView>

      {/* Remove-member confirm dialog — rendered outside the ScrollView so it
          floats above all content via the Modal z-axis. */}
      <ZConfirmDialog
        testID="group-remove-member-dialog"
        visible={memberToRemove !== null}
        tone="danger"
        title={t('groups.users.removeUser')}
        description={
          memberToRemove
            ? t('groups.users.confirmRemove', {
                name: `${memberToRemove.first_name} ${memberToRemove.last_name}`.trim(),
              })
            : ''
        }
        confirmLabel={t('common.actions.remove')}
        cancelLabel={t('common.actions.cancel')}
        confirmDisabled={removeIsPending}
        onConfirm={() => void handleConfirmRemoveMember()}
        onCancel={() => setMemberToRemove(null)}
      />
    </ZScreen>
  );
}
