import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, CircleUserRound, LogOut, Save } from 'lucide-react-native';
import { ZAvatarInput } from '../../components/ui/z-avatar-input';
import { ZBadge } from '../../components/ui/z-badge';
import { ZButton } from '../../components/ui/z-button';
import { ZCard } from '../../components/ui/z-card';
import { ZCheckbox } from '../../components/ui/z-checkbox';
import { ZCombobox, type ZComboboxOption } from '../../components/ui/z-combobox';
import { ZFieldError } from '../../components/ui/z-field-error';
import { ZFieldLabel } from '../../components/ui/z-field-label';
import { ZKeyboardAvoidingView } from '../../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../../components/ui/z-screen';
import { ZSkeleton } from '../../components/ui/z-skeleton';
import { ZTabs, type ZTab } from '../../components/ui/z-tabs';
import { ZTextInput } from '../../components/ui/z-text-input';
import { showToast } from '../../components/ui/z-toast';
import { authStore, useAuth } from '../../auth/auth-store';
import type { Me, UpdateMeRequest } from '../../auth/auth-store';
import { colors } from '../../theme/colors';

type PreferencesTab = 'personal-data' | 'email-preferences';
type EmailPreferences = Me['email_preferences'];
type Language = Me['language'];

const LANGUAGES: readonly Language[] = ['en', 'de', 'fr'] as const;

/**
 * Minimal IANA timezone list shipped for environments where
 * `Intl.supportedValuesOf('timeZone')` is unavailable (older Hermes builds).
 * The web ships no static list — it relies on the runtime value — so when the
 * runtime exposes the full set we use it, falling back to this representative
 * subset only when it does not.
 */
const FALLBACK_TIMEZONES: readonly string[] = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Lisbon',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

function supportedTimezones(): readonly string[] {
  const supportedValuesOf = (Intl as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;
  if (typeof supportedValuesOf === 'function') {
    try {
      const values = supportedValuesOf('timeZone');
      if (values.length > 0) return values;
    } catch {
      // Fall through to the static list.
    }
  }
  return FALLBACK_TIMEZONES;
}

/** Mirror of the web `timezoneLabel`: append the short UTC offset when resolvable. */
function timezoneLabel(timezone: string): string {
  try {
    const offset =
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? '';
    return offset ? `${timezone} (${offset})` : timezone;
  } catch {
    return timezone;
  }
}

function initials(user: Me): string {
  const first = user.first_name.trim()[0] ?? '';
  const last = user.last_name.trim()[0] ?? '';
  return `${first}${last}`.toUpperCase() || user.email[0]?.toUpperCase() || '';
}

/** Roles with a localized label under `groups.roles.*`; others render no badge. */
const KNOWN_ROLES: readonly string[] = ['admin', 'expert', 'student'] as const;

/**
 * Stable, comparable string of the editable values, mirroring the web
 * `normalizeFormValue` (trim name fields, treat empty avatar as null). Two
 * snapshots are dirty-equal iff their strings differ.
 */
function normalizeSnapshot(
  firstName: string,
  lastName: string,
  language: Language,
  timezone: string,
  avatar: string | null,
  emailPreferences: EmailPreferences,
): string {
  return JSON.stringify({
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    language,
    timezone,
    avatar: avatar || null,
    email_preferences: emailPreferences,
  });
}

function FieldSkeleton() {
  return (
    <View className="gap-2">
      <ZSkeleton className="h-4 w-24" />
      <ZSkeleton className="h-11 w-full" />
    </View>
  );
}

function LoadingState() {
  return (
    <ZScreen edges={['top']}>
      <ScrollView>
        <View className="gap-4 p-4">
          <ZCard className="gap-2">
            <ZSkeleton className="h-6 w-40" />
            <ZSkeleton className="h-4 w-full" />
          </ZCard>
          <ZCard className="gap-4">
            <View className="flex-row items-center gap-3">
              <ZSkeleton className="h-[72px] w-[72px] rounded-md" />
              <ZSkeleton className="h-10 w-28" />
            </View>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </ZCard>
        </View>
      </ScrollView>
    </ZScreen>
  );
}

/**
 * Editable preferences form. Local edit state is initialized from `user`; the
 * parent remounts this via `key={user.id}` whenever the account changes, so no
 * effect-based syncing is needed.
 */
function PreferencesForm({ user }: { user: Me }) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<PreferencesTab>('personal-data');
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [language, setLanguage] = useState<Language>(
    LANGUAGES.includes(user.language) ? user.language : 'en',
  );
  const [timezone, setTimezone] = useState(user.timezone);
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    ...user.email_preferences,
  });
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const languageOptions = useMemo<ZComboboxOption[]>(
    () => LANGUAGES.map((value) => ({ value, label: t(`preferences.languages.${value}`) })),
    [t],
  );
  const timezoneOptions = useMemo<ZComboboxOption[]>(
    () => supportedTimezones().map((value) => ({ value, label: timezoneLabel(value) })),
    [],
  );

  const tabs: ZTab[] = [
    { id: 'personal-data', label: t('preferences.personalData') },
    { id: 'email-preferences', label: t('preferences.emailPreferences') },
  ];

  const firstNameInvalid = firstName.trim().length === 0;
  const lastNameInvalid = lastName.trim().length === 0;
  const timezoneInvalid = timezone.trim().length === 0;
  const formInvalid = firstNameInvalid || lastNameInvalid || timezoneInvalid;

  // Snapshot of the editable values as initialized from `user`; the parent
  // remounts via `key={user.id}` on account change, so this never goes stale.
  // Mirrors the web `initialFormValue`/`hasFormChanges` dirty gating.
  const initial = useMemo(
    () =>
      normalizeSnapshot(
        user.first_name,
        user.last_name,
        LANGUAGES.includes(user.language) ? user.language : 'en',
        user.timezone,
        user.avatar || null,
        { ...user.email_preferences },
      ),
    [user],
  );
  const current = normalizeSnapshot(
    firstName,
    lastName,
    language,
    timezone,
    avatar,
    emailPreferences,
  );
  const isDirty = current !== initial;
  const saveDisabled = formInvalid || !isDirty || saving;

  const notificationsEnabled = emailPreferences.notifications_enabled;
  const can = (permission: string) => user.permissions.includes(permission);

  function setEmailPreference(key: keyof EmailPreferences, value: boolean) {
    setEmailPreferences((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSave() {
    if (saveDisabled) return;
    setSaving(true);
    setSaveFailed(false);

    const body: UpdateMeRequest = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      language,
      timezone,
      email_preferences: emailPreferences,
      ...(avatarDirty ? { avatar: avatar ?? '' } : {}),
    };

    const updated = await authStore.getState().updateCurrentUser(body);
    setSaving(false);

    if (!updated) {
      setSaveFailed(true);
      return;
    }
    setAvatarDirty(false);
    showToast(t('toast.successTitle'), t('preferences.saveSuccess'), 'success');
  }

  const emailRows: { key: keyof EmailPreferences; label: string; show: boolean }[] = [
    {
      key: 'asset_uploads_enabled',
      label: t('preferences.email.newVideos'),
      show: can('groups:create'),
    },
    {
      key: 'asset_reviews_enabled',
      label: t('preferences.email.reviewedVideos'),
      show: can('assets:create'),
    },
    {
      key: 'invitation_updates_enabled',
      label: t('preferences.email.invitationActivity'),
      show: can('groups:invites:create'),
    },
    // Group membership updates are always available (matches the web component).
    {
      key: 'group_membership_updates_enabled',
      label: t('preferences.email.groupMembership'),
      show: true,
    },
    {
      key: 'coaching_booking_updates_enabled',
      label: t('preferences.email.coachingBookings'),
      show: can('coaching:bookings:read'),
    },
    {
      key: 'coaching_reminders_enabled',
      label: t('preferences.email.coachingReminders'),
      show: can('coaching:bookings:read'),
    },
  ];

  return (
    <ZScreen edges={['top']}>
      <ZKeyboardAvoidingView>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="gap-4 p-4">
            <ZCard className="gap-2">
              <Text className="text-2xl font-semibold text-z-text">{t('preferences.title')}</Text>
              <Text className="text-sm leading-5 text-z-muted">{t('preferences.summary')}</Text>
              {KNOWN_ROLES.includes(user.role) ? (
                <ZBadge tone="neutral" label={t(`groups.roles.${user.role}`)} />
              ) : null}
            </ZCard>

            <ZTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as PreferencesTab)}
            />

            {activeTab === 'personal-data' ? (
              <ZCard className="gap-4">
                <View className="flex-row items-start gap-3 border-b border-z-border pb-4">
                  <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
                    <CircleUserRound color={colors.primary} size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-z-text">
                      {t('preferences.personalData')}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-z-muted">
                      {t('preferences.personalSummary')}
                    </Text>
                  </View>
                </View>

                <ZAvatarInput
                  value={avatar ?? undefined}
                  fallback={initials(user)}
                  alt={t('common.aria.avatarPreview')}
                  label={t('common.fields.avatar')}
                  onChange={(base64) => {
                    setAvatar(base64);
                    setAvatarDirty(true);
                  }}
                />

                <View className="gap-2">
                  <ZFieldLabel label={t('preferences.firstName')} required />
                  <ZTextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    accessibilityLabel={t('preferences.firstName')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    invalid={firstNameInvalid}
                  />
                  {firstNameInvalid ? (
                    <ZFieldError message={t('preferences.firstNameRequired')} />
                  ) : null}
                </View>

                <View className="gap-2">
                  <ZFieldLabel label={t('preferences.lastName')} required />
                  <ZTextInput
                    value={lastName}
                    onChangeText={setLastName}
                    accessibilityLabel={t('preferences.lastName')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    invalid={lastNameInvalid}
                  />
                  {lastNameInvalid ? (
                    <ZFieldError message={t('preferences.lastNameRequired')} />
                  ) : null}
                </View>

                <View className="gap-2">
                  <ZFieldLabel label={t('common.fields.language')} required />
                  <ZCombobox
                    value={language}
                    options={languageOptions}
                    placeholder={t('preferences.selectLanguage')}
                    searchPlaceholder={t('preferences.searchLanguages')}
                    accessibilityLabel={t('common.fields.language')}
                    onValueChange={(value) => setLanguage(value as Language)}
                  />
                </View>

                <View className="gap-2">
                  <ZFieldLabel label={t('common.fields.timezone')} required />
                  <ZCombobox
                    value={timezone || undefined}
                    options={timezoneOptions}
                    placeholder={t('preferences.selectTimezone')}
                    searchPlaceholder={t('preferences.searchTimezones')}
                    accessibilityLabel={t('common.fields.timezone')}
                    invalid={timezoneInvalid}
                    onValueChange={setTimezone}
                  />
                  {timezoneInvalid ? (
                    <ZFieldError message={t('preferences.timezoneRequired')} />
                  ) : null}
                </View>
              </ZCard>
            ) : (
              <ZCard className="gap-4">
                <View className="flex-row items-start gap-3 border-b border-z-border pb-4">
                  <View className="h-10 w-10 items-center justify-center rounded-md bg-z-surface-warm">
                    <Bell color={colors.primary} size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-z-text">
                      {t('preferences.emailPreferences')}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-z-muted">
                      {t('preferences.emailSummary')}
                    </Text>
                  </View>
                </View>

                <View className="gap-2 rounded-md border border-z-border bg-z-surface-warm p-4">
                  <ZCheckbox
                    value={notificationsEnabled}
                    label={t('preferences.email.all')}
                    labelClassName="font-semibold"
                    onValueChange={(value) => setEmailPreference('notifications_enabled', value)}
                  />
                  <Text className="text-xs leading-5 text-z-muted">
                    {t('preferences.email.allDescription')}
                  </Text>
                </View>

                <View className="gap-3">
                  {emailRows
                    .filter((row) => row.show)
                    .map((row) => (
                      <View
                        key={row.key}
                        className={`rounded-md border border-z-border bg-z-surface p-4 ${
                          notificationsEnabled ? '' : 'opacity-60'
                        }`}
                      >
                        <ZCheckbox
                          value={emailPreferences[row.key]}
                          label={row.label}
                          labelClassName="font-semibold"
                          disabled={!notificationsEnabled}
                          onValueChange={(value) => setEmailPreference(row.key, value)}
                        />
                      </View>
                    ))}
                </View>
              </ZCard>
            )}

            {saveFailed ? (
              <Text
                accessibilityRole="alert"
                className="text-sm font-medium text-z-danger"
              >
                {t('preferences.saveFailed')}
              </Text>
            ) : null}

            <ZButton
              label={saving ? t('preferences.saving') : t('common.actions.save')}
              loading={saving}
              disabled={saveDisabled}
              icon={<Save color={colors.onPrimary} size={16} />}
              onPress={() => void handleSave()}
            />

            <ZButton
              label={t('common.actions.signOut')}
              variant="secondary"
              icon={<LogOut color={colors.text} size={16} />}
              onPress={() => void authStore.getState().signOut()}
            />
          </View>
        </ScrollView>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);

  if (!user) return <LoadingState />;

  return <PreferencesForm key={user.id} user={user} />;
}
