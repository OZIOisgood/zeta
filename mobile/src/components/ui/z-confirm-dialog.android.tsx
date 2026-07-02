/**
 * ZConfirmDialog — Android implementation (Jetpack Compose via
 * @expo/ui/jetpack-compose).
 *
 * Routing logic:
 *   - No `children` → native Compose AlertDialog:
 *       AlertDialog.Title = dialog title
 *       AlertDialog.Text  = description (optional)
 *       AlertDialog.ConfirmButton = confirm action (TextButton, danger color when tone==='danger')
 *       AlertDialog.DismissButton = cancel action (TextButton) when !confirmOnly
 *       Driven by the `visible` prop; onDismissRequest → onCancel.
 *
 *   - With `children` → ZDialogPanel (native Compose ModalBottomSheet) hosting
 *       the full dialog body: icon + title + description + children + cancel/confirm
 *       footer. Matches the fallback layout so consumers (coaching.tsx cancel
 *       reason textarea) get the same information hierarchy.
 *       Never disables the confirm button for an empty reason (input is optional).
 *
 * Public API is identical to the bare .tsx fallback → coaching.tsx, asset/[id].tsx,
 * and availability.tsx MUST remain unchanged.
 *
 * On-device uncertainties:
 *   - AlertDialog confirm button color: Material 3 AlertDialog.ConfirmButton uses
 *     TextButton internally; danger tone sets contentColor=danger. Verify system
 *     rendering on device — some OEM overlays may override the color.
 *   - Sheet content scroll: ⚠️ expo/expo#46379 — RN ScrollView / FlatList may not
 *     scroll inside the Compose ModalBottomSheet. Sheet content MUST be non-scrolling.
 *   - Sheet sizing: skipPartiallyExpanded=true opens full-height; for short content
 *     this may show excessive whitespace. A future detent-based approach is deferred.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 AlertDialog: https://m3.material.io/components/dialogs/overview
 * Material 3 BottomSheet: https://m3.material.io/components/bottom-sheets/overview
 */

import { AlertDialog, Host, Text, TextButton } from '@expo/ui/jetpack-compose';
import { AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { Text as RNText, View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import { ZButton } from './z-button';
import { ZDialogPanel } from './z-dialog-panel';
import type { ZConfirmDialogProps, ZConfirmDialogTone } from './z-confirm-dialog.types';

export type { ZConfirmDialogTone, ZConfirmDialogProps } from './z-confirm-dialog.types';

const toneIcon = {
  info: Info,
  warning: AlertTriangle,
  danger: Trash2,
} as const;

const toneIconClasses: Record<ZConfirmDialogTone, string> = {
  info: 'bg-z-primary-soft',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
};

// Role NAMES at module scope — resolved per render so dark mode flips them.
const toneIconRoles = {
  info: 'accent',
  warning: 'warning',
  danger: 'danger',
} as const;

export function ZConfirmDialog({
  visible,
  title,
  description,
  tone = 'info',
  confirmLabel,
  cancelLabel,
  confirmOnly = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
  testID,
}: ZConfirmDialogProps) {
  const { color } = useRoleColors();

  // --- BRANCH: children present → native Compose ModalBottomSheet ---
  if (children != null) {
    const Icon = toneIcon[tone];

    return (
      <ZDialogPanel visible={visible} onClose={onCancel} testID={testID}>
        <View className="flex-row items-start gap-3">
          <View
            className={`h-10 w-10 items-center justify-center rounded-md ${toneIconClasses[tone]}`}
          >
            <Icon color={color(toneIconRoles[tone])} size={20} />
          </View>
          <View className="min-w-0 flex-1">
            <RNText className="text-base font-semibold leading-6 text-z-text">{title}</RNText>
            {description ? (
              <RNText className="mt-2 text-sm leading-6 text-z-muted">{description}</RNText>
            ) : null}
          </View>
        </View>

        {children}

        <View className="mt-6 flex-row justify-end gap-2">
          {!confirmOnly && cancelLabel ? (
            <ZButton label={cancelLabel} variant="secondary" onPress={onCancel} />
          ) : null}
          <ZButton
            label={confirmLabel}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={confirmDisabled}
            onPress={onConfirm}
          />
        </View>
      </ZDialogPanel>
    );
  }

  // --- BRANCH: no children → native Compose AlertDialog ---
  // Only render the AlertDialog when visible; Compose AlertDialog requires
  // an explicit onDismissRequest and is mounted/unmounted based on `visible`.
  if (!visible) return null;

  const isDestructive = tone === 'danger';

  return (
    <Host>
      <AlertDialog onDismissRequest={onCancel}>
        <AlertDialog.Title>
          <Text style={{ fontFamily: 'NunitoSans_700Bold' }}>{title}</Text>
        </AlertDialog.Title>
        {description ? (
          <AlertDialog.Text>
            <Text style={{ fontFamily: 'NunitoSans_400Regular' }}>{description}</Text>
          </AlertDialog.Text>
        ) : null}
        <AlertDialog.ConfirmButton>
          <TextButton
            onClick={confirmDisabled ? undefined : onConfirm}
            enabled={!confirmDisabled}
            colors={{
              contentColor: isDestructive ? color('danger') : color('accent'),
              disabledContentColor: color('onSurfaceVariant'),
            }}
          >
            <Text style={{ fontFamily: 'NunitoSans_600SemiBold' }}>{confirmLabel}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
        {!confirmOnly && cancelLabel ? (
          <AlertDialog.DismissButton>
            <TextButton
              onClick={onCancel}
              colors={{
                contentColor: color('accent'),
              }}
            >
              <Text style={{ fontFamily: 'NunitoSans_600SemiBold' }}>{cancelLabel}</Text>
            </TextButton>
          </AlertDialog.DismissButton>
        ) : null}
      </AlertDialog>
    </Host>
  );
}
