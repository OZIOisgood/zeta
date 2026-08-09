import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZButton } from '../components/ui/z-button';
import { ZFieldError } from '../components/ui/z-field-error';
import { ZFieldLabel } from '../components/ui/z-field-label';
import { ZKeyboardAvoidingView } from '../components/ui/z-keyboard-avoiding-view';
import { ZScreen } from '../components/ui/z-screen';
import { ZTextInput } from '../components/ui/z-text-input';
import { showToast } from '../components/ui/z-toast';
import { useRedeemAccessMutation } from '../api/queries/access';
import { authStore, useAuth } from '../auth/auth-store';

/**
 * Waitlist gate for signed-in users whose account is not activated yet.
 *
 * A new account lands `waitlisted`: GET /auth/me succeeds, but every feature
 * route sits behind RequireActiveAccess and answers 403. Without this screen the
 * app would route such a user straight into the tabs and fail on every request
 * with no way out. POST /access/redeem is the one call they may make, so the
 * screen offers exactly that — plus sign-out.
 *
 * Mirrors the information architecture of the web /welcome page (eyebrow +
 * headline + body, then the code step); the success state is a toast rather
 * than its own screen, because activating flips `access_status` and the root
 * layout swaps this screen for the app in the same pass.
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const [step, setStep] = useState<'intro' | 'code'>('intro');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const redeem = useRedeemAccessMutation();

  async function handleActivate() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t('access.welcome.errorIncomplete'));
      return;
    }
    setError(null);
    try {
      await redeem.mutateAsync(trimmed);
      showToast(t('access.welcome.successTitle'), t('access.welcome.eyebrowDone'), 'success');
      // Re-read the profile: access_status flips server-side, and the root
      // layout gates the app on it.
      await authStore.getState().refreshUser();
    } catch {
      setError(t('access.welcome.errorInvalid'));
    }
  }

  return (
    <ZScreen className="px-6" testID="welcome-screen">
      <ZKeyboardAvoidingView>
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-sm rounded-[20px] bg-surface p-8">
            {step === 'intro' ? (
              <>
                <Text className="text-xs font-semibold uppercase text-z-muted">
                  {t('access.welcome.eyebrowWaitlist')}
                </Text>
                <Text className="mt-2 text-xl font-semibold text-z-text">
                  {t('access.welcome.waitlistTitle')}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-z-muted">
                  {t('access.welcome.waitlistBody')}
                </Text>
                <View className="mt-7 gap-3">
                  <ZButton
                    label={t('access.welcome.enterCode')}
                    onPress={() => setStep('code')}
                    fullWidth
                    testID="welcome-enter-code"
                  />
                  <ZButton
                    label={t('access.welcome.signOut')}
                    variant="tonal"
                    onPress={() => void authStore.getState().signOut()}
                    fullWidth
                    testID="welcome-sign-out"
                  />
                </View>
              </>
            ) : (
              <>
                <Text className="text-xs font-semibold uppercase text-z-muted">
                  {t('access.welcome.eyebrowCode')}
                </Text>
                <Text className="mt-2 text-xl font-semibold text-z-text">
                  {t('access.welcome.codeTitle')}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-z-muted">
                  {t('access.welcome.codeBody')}
                </Text>

                <View className="mt-6">
                  <ZFieldLabel label={t('access.welcome.codeLabel')} />
                  <ZTextInput
                    testID="welcome-code-input"
                    accessibilityLabel={t('access.welcome.codeLabel')}
                    value={code}
                    onChangeText={(next) => {
                      setCode(next);
                      if (error) setError(null);
                    }}
                    // Codes are uppercase Crockford; the server normalizes, but
                    // matching the real shape avoids a confusing mismatch.
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={() => void handleActivate()}
                    invalid={error !== null}
                    disabled={redeem.isPending}
                  />
                  {error ? (
                    <ZFieldError message={error} />
                  ) : (
                    <Text className="mt-1 text-xs text-z-muted">
                      {t('access.welcome.codeHint')}
                    </Text>
                  )}
                </View>

                <View className="mt-7 gap-3">
                  <ZButton
                    label={
                      redeem.isPending
                        ? t('access.welcome.activating')
                        : t('access.welcome.activate')
                    }
                    onPress={() => void handleActivate()}
                    loading={redeem.isPending}
                    disabled={redeem.isPending}
                    fullWidth
                    testID="welcome-activate"
                  />
                  <ZButton
                    label={t('access.welcome.back')}
                    variant="tonal"
                    onPress={() => {
                      setError(null);
                      setStep('intro');
                    }}
                    disabled={redeem.isPending}
                    fullWidth
                    testID="welcome-back"
                  />
                </View>
              </>
            )}

            {user?.email ? (
              <Text className="mt-6 text-center text-xs text-z-muted">{user.email}</Text>
            ) : null}
          </View>
        </View>
      </ZKeyboardAvoidingView>
    </ZScreen>
  );
}
