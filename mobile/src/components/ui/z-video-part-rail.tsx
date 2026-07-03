/**
 * ZVideoPartRail — shared NativeWind implementation (web / iOS / Android / jest).
 *
 * A clip switcher attached to the player (episode-picker pattern). Progressive
 * disclosure by clip count:
 *   - 0–1 parts → renders null (a single clip needs no switcher).
 *   - 2–5 parts → a subtle horizontal pill row directly under the player: a
 *     "Teile" label + one low-profile pill per clip. Active pill =
 *     secondary-container fill; inactive ready pill = outlined/transparent; a
 *     still-processing pill is dimmed with a leading spinner and is inert. A
 *     horizontal ScrollView keeps a peek of the next pill on overflow.
 *   - >5 parts → a compact "Part X of N ▾" trigger that opens a bottom sheet
 *     (the native ZDialogPanel) with the full list — one row per clip.
 *
 * No per-part duration: the real AssetVideo has no duration/label, so pills and
 * rows show only "Teil N" + ready/processing status. Glyph and spinner colors
 * come from role tokens (useRoleColors); fills/borders/text from NativeWind
 * role classes. No raw hex.
 *
 * This is the ONLY implementation file (no .ios/.android variants) — see
 * z-video-part-rail.types.ts for the tier rationale (Composition: Custom-RN
 * pills/trigger + the native ZDialogPanel sheet).
 *
 * Tier: Custom-RN (composition).
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useRoleColors } from '../../theme/native';
import { Touchable } from './touchable';
import { ZDialogPanel } from './z-dialog-panel';
import { ZSymbol } from './z-symbol';
import type { ZVideoPart, ZVideoPartRailProps } from './z-video-part-rail.types';

export type { ZVideoPart, ZVideoPartRailProps } from './z-video-part-rail.types';

/** Beyond this many clips the pill row collapses into a trigger + bottom sheet. */
const MANY_THRESHOLD = 5;

// ── 2–5 parts: pill row ────────────────────────────────────────────────────────

function PillRow({ parts, activeId, onChange }: ZVideoPartRailProps) {
  const { t } = useTranslation();
  const { color } = useRoleColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ alignItems: 'center', gap: 8, paddingRight: 16 }}
    >
      <Text className="text-xs font-bold text-z-muted" style={{ flex: 0 }}>
        {t('videos.partsLabel')}
      </Text>
      {parts.map((part, i) => {
        const isActive = part.id === activeId;
        const label = t('videos.phase4.videoPart', { count: i + 1 });
        const processing = !part.ready;
        return (
          <Touchable
            key={part.id}
            testID={`part-pill-${part.id}`}
            accessibilityLabel={
              processing ? `${label}, ${t('videos.partProcessing')}` : label
            }
            selected={isActive}
            disabled={processing}
            onPress={processing ? undefined : () => onChange(part.id)}
            style={{ opacity: processing ? 0.7 : 1 }}
            className={[
              'h-[30px] flex-row items-center gap-1.5 rounded-full border px-3',
              isActive
                ? 'border-transparent bg-secondary-container'
                : 'border-outline bg-transparent',
            ].join(' ')}
          >
            {processing ? (
              <ActivityIndicator size="small" color={color('onSurfaceVariant')} />
            ) : null}
            <Text
              className={[
                'text-[12.5px]',
                isActive ? 'font-bold text-on-secondary-container' : 'font-semibold',
                processing ? 'text-z-muted' : isActive ? '' : 'text-z-text',
              ].join(' ')}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {label}
            </Text>
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

// ── >5 parts: trigger + bottom sheet ───────────────────────────────────────────

function SheetRow({
  part,
  index,
  isActive,
  onChange,
  checkColor,
  spinnerColor,
}: {
  part: ZVideoPart;
  index: number;
  isActive: boolean;
  onChange: (id: string) => void;
  checkColor: string;
  spinnerColor: string;
}) {
  const { t } = useTranslation();
  const label = t('videos.phase4.videoPart', { count: index + 1 });
  const processing = !part.ready;

  return (
    <Touchable
      testID={`part-row-${part.id}`}
      accessibilityLabel={processing ? `${label}, ${t('videos.partProcessing')}` : label}
      selected={isActive}
      disabled={processing}
      onPress={processing ? undefined : () => onChange(part.id)}
      style={{ opacity: processing ? 0.6 : 1 }}
      className={[
        'flex-row items-center gap-3 rounded-lg px-4 py-3',
        isActive ? 'bg-secondary-container' : 'bg-transparent',
      ].join(' ')}
    >
      <View className="w-[22px] items-center justify-center">
        {isActive ? (
          <ZSymbol name="check" label="" size={18} color={checkColor} />
        ) : (
          <Text
            className="text-[13px] font-bold text-z-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {index + 1}
          </Text>
        )}
      </View>
      <Text
        className={[
          'flex-1 text-[15px]',
          isActive ? 'font-bold text-on-secondary-container' : 'font-semibold text-z-text',
        ].join(' ')}
      >
        {label}
      </Text>
      {processing ? (
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" color={spinnerColor} />
          <Text className="text-[12.5px] font-bold text-z-muted">
            {t('videos.partProcessing')}
          </Text>
        </View>
      ) : null}
    </Touchable>
  );
}

function TriggerSheet({ parts, activeId, onChange }: ZVideoPartRailProps) {
  const { t } = useTranslation();
  const { color } = useRoleColors();
  const [open, setOpen] = useState(false);

  const activeIndex = useMemo(
    () => parts.findIndex((p) => p.id === activeId),
    [parts, activeId],
  );
  // No part is active yet (e.g. every clip is still processing → the screen has
  // no playable `active`): show a neutral count rather than implying "Part 1 of
  // N" is selected, mirroring the pill row, which highlights nothing here.
  const hasActive = activeIndex >= 0;
  const triggerLabel = hasActive
    ? t('videos.partOfCount', { n: activeIndex + 1, count: parts.length })
    : String(parts.length);
  const triggerA11yLabel = hasActive
    ? triggerLabel
    : `${parts.length} ${t('videos.partsLabel')}`;

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-xs font-bold text-z-muted">{t('videos.partsLabel')}</Text>
      <Touchable
        testID="part-rail-trigger"
        accessibilityLabel={triggerA11yLabel}
        onPress={() => setOpen(true)}
        className="h-8 flex-row items-center gap-1.5 rounded-full border border-outline pl-3 pr-1.5"
      >
        <Text
          className="text-[13px] font-semibold text-z-text"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {triggerLabel}
        </Text>
        {/* Decorative: the trigger Touchable already carries the a11y label. */}
        <ZSymbol name="chevron-down" label="" size={16} color={color('onSurfaceVariant')} />
      </Touchable>

      <ZDialogPanel
        visible={open}
        onClose={() => setOpen(false)}
        closeLabel={t('common.actions.close')}
        testID="part-rail-sheet"
      >
        <View className="gap-1">
          <View className="flex-row items-center gap-2 px-1 pb-2">
            <Text className="text-base font-extrabold text-z-text">
              {t('videos.partsLabel')}
            </Text>
            <Text className="text-[13px] font-bold text-z-muted">{String(parts.length)}</Text>
          </View>
          {/* The clip count of one upload is bounded (a single asset's parts),
              so the rows are a simple mapped list sized to content. NOT wrapped
              in a ScrollView/FlatList on purpose: ZDialogPanel.android is a
              Compose ModalBottomSheet where RN scroll inside it is unreliable
              (expo/expo#46379). A bounded mapped list avoids that trap. */}
          {parts.map((part, i) => (
            <SheetRow
              key={part.id}
              part={part}
              index={i}
              isActive={part.id === activeId}
              onChange={select}
              checkColor={color('onSecondaryContainer')}
              spinnerColor={color('onSurfaceVariant')}
            />
          ))}
        </View>
      </ZDialogPanel>
    </View>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export function ZVideoPartRail({ parts, activeId, onChange, testID }: ZVideoPartRailProps) {
  // Progressive disclosure: a single clip (or none) needs no switcher.
  if (parts.length <= 1) return null;

  const many = parts.length > MANY_THRESHOLD;

  return (
    <View testID={testID} className="px-4 pt-3">
      {many ? (
        <TriggerSheet parts={parts} activeId={activeId} onChange={onChange} />
      ) : (
        <PillRow parts={parts} activeId={activeId} onChange={onChange} />
      )}
    </View>
  );
}
