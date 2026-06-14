import { useRef, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Copy,
  Link,
  Mail,
  QrCode,
  Settings,
  Share2,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react-native';
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
import { ZAvatar } from '../../components/ui/z-avatar';
import { ZBadge } from '../../components/ui/z-badge';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZConfirmDialog } from '../../components/ui/z-confirm-dialog';
import { ZEmptyState } from '../../components/ui/z-empty-state';
import { ZFieldError } from '../../components/ui/z-field-error';
import { ZFieldLabel } from '../../components/ui/z-field-label';
import { ZIconButton } from '../../components/ui/z-icon-button';
import { ZKeyboardAvoidingView } from '../../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { showToast } from '../../components/ui/z-toast';
import { ZTextInput } from '../../components/ui/z-text-input';
import { colors } from '../../theme/colors';

/** Web invite base URL: produce the same link the web app generates so a QR
 *  scanned by a system camera opens the web invitation page. Falls back to
 *  localhost for local development. */
const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:4200';

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
  return <View className="h-px bg-z-border" />;
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
  const Icon = kind === 'experts' ? ShieldCheck : Users;
  const emptyTitle = kind === 'experts' ? t('groups.noExperts') : t('groups.noStudents');
  const emptyDescription =
    kind === 'experts' ? t('groups.noExpertsDescription') : t('groups.inviteStudents');

  return (
    <ZCard>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
          <Icon color={colors.primary} size={20} />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-base font-semibold text-z-text">{title}</Text>
            <ZBadge label={String(count)} tone="neutral" />
          </View>
          <Text className="mt-1 text-sm leading-6 text-z-muted">{description}</Text>
        </View>
      </View>

      {isLoading ? (
        <MembersSkeleton />
      ) : isError ? (
        <View className="mt-5">
          <ZEmptyState
            title={t('groups.membersLoadFailed')}
            description={t('home.error.description')}
            icon={<TriangleAlert color={colors.primary} size={24} />}
          >
            <ZButton
              testID={`members-retry-${kind}`}
              label={t('common.actions.retry')}
              variant="secondary"
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
          <ZEmptyState title={emptyTitle} description={emptyDescription} icon={<Icon color={colors.primary} size={24} />} />
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

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [invitation, setInvitation] = useState<{ id: string; code: string } | null>(null);
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
      showToast(t('groups.inviteDialog.failed'), undefined, 'error');
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
    setQrError(false);
  }

  return (
    <ZCard testID="group-invite-section">
      {/* Header */}
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
          <QrCode color={colors.primary} size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-z-text">
            {t('groups.inviteDialog.title')}
          </Text>
          <Text className="mt-1 text-sm leading-6 text-z-muted">
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
              placeholder="student@example.com"
              invalid={emailTouched && emailInvalid}
            />
            {emailTouched && emailInvalid && (
              <ZFieldError message={t('groups.inviteDialog.emailInvalid')} />
            )}
          </View>

          {/* Email hint */}
          <View className="flex-row items-start gap-2 rounded-md border border-z-border bg-z-bg p-3">
            <Mail color={colors.primary} size={16} />
            <Text className="flex-1 text-sm leading-6 text-z-muted">
              {t('groups.inviteDialog.emailHint')}
            </Text>
          </View>

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
            {/* QR code */}
            <View className="items-center justify-center rounded-md border border-dashed border-z-border bg-white p-3">
              {qrError ? (
                <View className="items-center p-3">
                  <QrCode color={colors.muted} size={32} />
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
                <Link color={colors.primary} size={16} />
                <Text className="text-sm font-semibold text-z-text">
                  {t('groups.inviteDialog.shareLink')}
                </Text>
              </View>
              <View className="mt-2 rounded-md border border-z-border bg-white px-3 py-2">
                <Text className="text-xs text-z-muted" numberOfLines={2}>{inviteLink}</Text>
              </View>
              <Text className="mt-2 text-sm leading-6 text-z-muted">
                {t('groups.inviteDialog.shareHint')}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="gap-2">
            <ZButton
              testID="group-invite-copy-btn"
              label={t('common.actions.copyLink')}
              variant="secondary"
              icon={<Copy color={colors.text} size={16} />}
              onPress={() => void handleCopyLink()}
            />
            {!qrError && (
              <ZButton
                testID="group-invite-share-qr-btn"
                label={t('common.actions.downloadQr')}
                variant="secondary"
                icon={<Share2 color={colors.text} size={16} />}
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
      <ZScreen className="gap-4 p-4">
        <ZSkeleton testID="group-detail-skeleton" className="h-20 w-full" />
        <ZSkeleton className="h-5 w-3/5" />
        <ZSkeleton className="h-4 w-4/5" />
      </ZScreen>
    );
  }

  if (isError || !data) {
    return (
      <ZScreen className="items-center justify-center px-8">
        <ZEmptyState
          title={t('groups.phase4.detailFailed')}
          description={t('home.error.description')}
          icon={<TriangleAlert color={colors.primary} size={24} />}
        >
          <View className="gap-2">
            <ZButton
              label={t('common.actions.retry')}
              variant="secondary"
              onPress={() => void refetch()}
            />
            <ZButton
              label={t('common.actions.back')}
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </ZEmptyState>
      </ZScreen>
    );
  }

  return (
    <ZScreen edges={['bottom']}>
      <ZKeyboardAvoidingView>
        <ScrollView
          className="flex-1 bg-z-bg"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center gap-3 p-4">
            <ZIconButton label={t('common.actions.back')} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={22} />
            </ZIconButton>
            <ZAvatar
              image={data.avatar ?? undefined}
              fallback={initialsFromName(data.name)}
              alt={data.name}
              size={56}
            />
            <View className="flex-1">
              <Text className="text-2xl font-semibold text-z-text" numberOfLines={2}>
                {data.name}
              </Text>
            </View>
            {canOpenPreferences ? (
              <ZIconButton
                testID="group-preferences-btn"
                label={t('groups.preferences')}
                onPress={() => router.push(`/group/${id ?? ''}/preferences`)}
              >
                <Settings color={colors.text} size={22} />
              </ZIconButton>
            ) : null}
          </View>

          <View className="px-4 pb-4">
            <Text className="text-sm text-z-muted">
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
                icon={<TriangleAlert color={colors.primary} size={24} />}
              />
            )}

            {/* Danger zone */}
            {canLeave && (
              <View className="pt-4">
                <ZButton
                  testID="group-leave"
                  label={t('groups.leave.action')}
                  variant="danger"
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
