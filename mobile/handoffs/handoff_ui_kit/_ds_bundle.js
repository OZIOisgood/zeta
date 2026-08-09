/* @ds-bundle: {"format":3,"namespace":"StridoDesignSystem_dc14ef","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"Fab","sourcePath":"components/buttons/Fab.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"Chip","sourcePath":"components/data-display/Chip.jsx"},{"name":"Divider","sourcePath":"components/data-display/Divider.jsx"},{"name":"IconTile","sourcePath":"components/data-display/IconTile.jsx"},{"name":"ListItem","sourcePath":"components/data-display/ListItem.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Snackbar","sourcePath":"components/feedback/Snackbar.jsx"},{"name":"FieldLabel","sourcePath":"components/forms/FieldLabel.jsx"},{"name":"FieldError","sourcePath":"components/forms/FieldLabel.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"LargeTitleBar","sourcePath":"components/navigation/LargeTitleBar.jsx"},{"name":"NavigationBar","sourcePath":"components/navigation/NavigationBar.jsx"},{"name":"SegmentedButton","sourcePath":"components/navigation/SegmentedButton.jsx"},{"name":"Stepper","sourcePath":"components/navigation/Stepper.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopAppBar","sourcePath":"components/navigation/TopAppBar.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"654b3ab41c62","components/buttons/Fab.jsx":"c66517255522","components/buttons/IconButton.jsx":"ef00c0c923a2","components/data-display/Avatar.jsx":"74594cc213b3","components/data-display/Badge.jsx":"5769988878f6","components/data-display/Card.jsx":"debfc41f870f","components/data-display/Chip.jsx":"51897a0cfcc8","components/data-display/Divider.jsx":"525630e954f6","components/data-display/IconTile.jsx":"c4a51465e7f7","components/data-display/ListItem.jsx":"0a330f0c8a8b","components/feedback/Dialog.jsx":"2d398ce6ba59","components/feedback/EmptyState.jsx":"cf20b59e67bc","components/feedback/ProgressBar.jsx":"aad990519ec1","components/feedback/Skeleton.jsx":"3b2b8890f287","components/feedback/Snackbar.jsx":"8ef1ff0374a6","components/forms/FieldLabel.jsx":"562e9d2abd4e","components/forms/Select.jsx":"9bc04e2f0fbc","components/forms/Switch.jsx":"337d37749142","components/forms/TextInput.jsx":"716b79a2c218","components/forms/Textarea.jsx":"150c114a12e1","components/navigation/LargeTitleBar.jsx":"218123f9b847","components/navigation/NavigationBar.jsx":"53b30add607d","components/navigation/SegmentedButton.jsx":"8cfc95e58aad","components/navigation/Stepper.jsx":"3c4aa0f4255a","components/navigation/Tabs.jsx":"8b71187254e5","components/navigation/TopAppBar.jsx":"87277e7d0c4e","design_handoff_home_videos/design-references/data.js":"e5dc9639a2e2","design_handoff_home_videos/design-references/material-home.jsx":"b56a4e45a6b6","design_handoff_home_videos/design-references/material-themes.js":"06da6269c998","design_handoff_home_videos/design-references/videos-home.jsx":"b194c98269a9","handoff_ui_kit/design-references/data.js":"46930a5fec19","handoff_ui_kit/design-references/screens.jsx":"30eaa359d9c1","handoff_ui_kit/design-references/screens2.jsx":"6c1001c4770e","handoff_ui_kit/design-references/screens3.jsx":"d54a7bb12771","handoff_ui_kit/design-references/tweaks-panel.jsx":"6591467622ed","redesign/data.js":"e5dc9639a2e2","redesign/material-home.jsx":"b56a4e45a6b6","redesign/material-themes.js":"06da6269c998","redesign/videos-home.jsx":"b194c98269a9","screens.jsx":"97b89b78d976","screens3.jsx":"8564e1fa7b7c","ui_kits/mobile/data.js":"46930a5fec19","ui_kits/mobile/screens.jsx":"30eaa359d9c1","ui_kits/mobile/screens2.jsx":"6c1001c4770e","ui_kits/mobile/screens3.jsx":"d54a7bb12771","ui_kits/mobile/tweaks-panel.jsx":"6591467622ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StridoDesignSystem_dc14ef = window.StridoDesignSystem_dc14ef || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
/**
 * Button — Strido's primary action control.
 *
 * `platform="material"` (default): a full-radius **pill** (Material You).
 * `primary` is the filled ember; `tonal` is the secondary-container fill (the
 * recommended lower-emphasis action); `secondary` is the outlined button;
 * `ghost` is text-only with a hover layer; `link` drops all chrome and renders
 * inline accent text. Labels are 14px / 700.
 *
 * `platform="ios"`: a HIG button — 12px continuous-corner rounded rect, 17px /
 * 600 label, press = dim. `primary` → `.borderedProminent` (filled tint);
 * `tonal`/`secondary` → `.bordered` / tinted gray fill; `ghost`/`link` →
 * `.plain` (tint text). Native equivalent: SwiftUI `Button` configurations /
 * RN Pressable; the same logical variants map to `.ios.tsx`.
 */

const MATERIAL_VARIANT = {
  primary: {
    background: 'var(--role-accent)',
    color: 'var(--role-on-accent)',
    border: '1px solid var(--role-accent)'
  },
  tonal: {
    background: 'var(--role-secondary-container)',
    color: 'var(--role-on-secondary-container)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'transparent',
    color: 'var(--role-accent-strong)',
    border: '1px solid var(--role-outline)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--role-on-surface-variant)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--z-danger)',
    color: '#fff',
    border: '1px solid var(--z-danger)'
  },
  link: {
    background: 'transparent',
    color: 'var(--z-primary-strong)',
    border: 'none'
  }
};

// iOS / HIG — tinted fills, no full pill. Tint = brand accent.
const IOS_VARIANT = {
  primary: {
    background: 'var(--role-accent)',
    color: 'var(--role-on-accent)',
    border: '1px solid transparent'
  },
  tonal: {
    background: 'var(--role-accent-container)',
    color: 'var(--role-accent-strong)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--role-surface-3)',
    color: 'var(--role-accent-strong)',
    border: '1px solid transparent'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--role-accent-strong)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--z-danger)',
    color: '#fff',
    border: '1px solid transparent'
  },
  link: {
    background: 'transparent',
    color: 'var(--role-accent-strong)',
    border: 'none'
  }
};
function Button({
  label,
  children,
  onClick,
  variant = 'primary',
  platform = 'material',
  disabled = false,
  loading = false,
  icon,
  type = 'button',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const isLink = variant === 'link';
  const isDisabled = disabled || loading;
  const map = ios ? IOS_VARIANT : MATERIAL_VARIANT;
  const v = map[variant] || map.primary;
  const shape = isLink ? {
    padding: 0
  } : ios ? {
    padding: '13px 20px',
    borderRadius: 12
  } : {
    padding: '11px 24px',
    minHeight: 40,
    borderRadius: 'var(--radius-button)'
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ios ? '6px' : '8px',
    fontFamily: 'var(--font-sans)',
    fontSize: ios && !isLink ? '17px' : 'var(--text-sm)',
    fontWeight: ios ? 600 : 600,
    letterSpacing: ios ? '-0.01em' : 'normal',
    lineHeight: 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    transition: 'opacity .12s ease, background-color .12s ease',
    WebkitTapHighlightColor: 'transparent',
    ...shape,
    ...v,
    ...style
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    className: className,
    disabled: isDisabled,
    "aria-busy": loading || undefined,
    "data-m3-state": !ios && !isLink ? '' : undefined,
    onClick: onClick,
    style: base
  }, loading ? /*#__PURE__*/React.createElement(Spinner, {
    color: v.color
  }) : icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, label ?? children));
}
function Spinner({
  color
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      display: 'inline-block',
      animation: 'strido-spin .7s linear infinite'
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes strido-spin{to{transform:rotate(360deg)}}`));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Fab.jsx
try { (() => {
/**
 * Fab — Material 3 floating action button.
 *
 * The primary screen action that floats above content. `extended` shows a label
 * beside the icon (a pill); otherwise it's a 56px rounded-square icon button.
 * `tone` picks the container: `primary` (filled ember) or `tonal`
 * (primary/accent-container). Lifted by --shadow-fab. Position it yourself
 * (absolute, bottom-right) inside the screen frame.
 */
const TONE = {
  primary: {
    background: 'var(--role-accent)',
    color: 'var(--role-on-accent)'
  },
  tonal: {
    background: 'var(--role-accent-container)',
    color: 'var(--role-on-accent-container)'
  }
};
function Fab({
  icon,
  label,
  extended = false,
  tone = 'primary',
  onClick,
  className = '',
  style = {}
}) {
  const t = TONE[tone] || TONE.primary;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    onClick: onClick,
    className: className,
    "data-m3-state": "",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: extended ? 10 : 0,
      height: 56,
      width: extended ? 'auto' : 56,
      padding: extended ? '0 20px' : 0,
      borderRadius: 'var(--radius-fab)',
      border: 'none',
      background: t.background,
      color: t.color,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: 'var(--shadow-fab)',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, icon) : null, extended && label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Fab });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Fab.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
/**
 * IconButton — icon-only action. Mirrors the app's ZIconButton.
 *
 * `platform="material"` (default) — Material You: the FAB is `variant="primary"
 * size="lg"` (rounded-square, --shadow-fab). `shape="circle"` for a circular
 * control; `tonal` fills with the secondary container.
 *
 * `platform="ios"` — a HIG bar-button / circular control: always circular, no
 * shadow, and the bare (`ghost`/`secondary`) buttons render as **tinted**
 * (accent) glyphs rather than gray, matching iOS toolbar/nav-bar buttons.
 * Native equivalent: SF Symbol `UIBarButtonItem` / SwiftUI `Button(.plain)`.
 */

const MATERIAL_VARIANT = {
  primary: {
    background: 'var(--role-accent)',
    border: '1px solid var(--role-accent)',
    color: 'var(--role-on-accent)'
  },
  tonal: {
    background: 'var(--role-secondary-container)',
    border: '1px solid transparent',
    color: 'var(--role-on-secondary-container)'
  },
  secondary: {
    background: 'var(--role-surface)',
    border: '1px solid var(--role-outline)',
    color: 'var(--role-on-surface)'
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--role-on-surface-variant)'
  }
};
const IOS_VARIANT = {
  primary: {
    background: 'var(--role-accent)',
    border: '1px solid transparent',
    color: 'var(--role-on-accent)'
  },
  tonal: {
    background: 'var(--role-accent-container)',
    border: '1px solid transparent',
    color: 'var(--role-accent-strong)'
  },
  secondary: {
    background: 'var(--role-surface-3)',
    border: '1px solid transparent',
    color: 'var(--role-accent-strong)'
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--role-accent-strong)'
  }
};
const SIZE_MATERIAL = {
  sm: 40,
  md: 48,
  lg: 56
};
const SIZE_IOS = {
  sm: 36,
  md: 44,
  lg: 56
};
function IconButton({
  label,
  children,
  onClick,
  variant = 'ghost',
  platform = 'material',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const dim = (ios ? SIZE_IOS : SIZE_MATERIAL)[size] || (ios ? SIZE_IOS : SIZE_MATERIAL).md;
  const map = ios ? IOS_VARIANT : MATERIAL_VARIANT;
  const v = map[variant] || map.ghost;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    "data-m3-state": !ios ? '' : undefined,
    onClick: onClick,
    className: className,
    style: {
      width: dim,
      height: dim,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: ios || shape === 'circle' ? 'var(--radius-full)' : 'var(--radius-fab)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'opacity .12s ease, background-color .12s ease',
      WebkitTapHighlightColor: 'transparent',
      boxShadow: !ios && variant === 'primary' && size === 'lg' ? 'var(--shadow-fab)' : 'none',
      ...v,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
/**
 * Avatar — user/group image with initials fallback. Mirrors ZAvatar.
 * `rounded` (md radius) for groups, `circle` for people.
 */
function Avatar({
  image,
  fallback = '',
  size = 36,
  shape = 'rounded',
  alt = '',
  className = '',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": alt,
    className: className,
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'var(--role-surface-variant)',
      borderRadius: shape === 'circle' ? 'var(--radius-full)' : 'var(--radius-md)',
      ...style
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: alt,
    style: {
      width: size,
      height: size,
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: Math.max(11, Math.round(size * 0.38)),
      fontWeight: 700,
      color: 'var(--z-primary)'
    }
  }, fallback));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
/**
 * Badge — small status pill / count. Mirrors ZBadge.
 * Tone drives the container + text color from the role tokens.
 */

const TONE = {
  neutral: {
    background: 'var(--role-surface-variant)',
    color: 'var(--role-on-surface-variant)',
    border: 'var(--role-outline)'
  },
  primary: {
    background: 'var(--role-accent-container)',
    color: 'var(--role-on-accent-container)',
    border: 'var(--role-accent-container)'
  },
  success: {
    background: 'var(--role-success-container)',
    color: 'var(--role-on-success-container)',
    border: 'var(--role-success-container)'
  },
  warning: {
    background: 'var(--role-warning-container)',
    color: 'var(--role-on-warning-container)',
    border: 'var(--role-warning-container)'
  },
  danger: {
    background: 'var(--role-danger-container)',
    color: 'var(--role-on-danger-container)',
    border: 'var(--role-danger-container)'
  }
};
function Badge({
  label,
  children,
  tone = 'neutral',
  className = '',
  style = {}
}) {
  const t = TONE[tone] || TONE.neutral;
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      alignSelf: 'flex-start',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      border: `1px solid ${t.border}`,
      background: t.background,
      color: t.color,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...style
    }
  }, label ?? children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
/**
 * Card — the section surface.
 *
 * `platform="material"` (default) — Material You: a **filled** card on a warm
 * tonal surface (--role-surface-1), 20px radius, no border (the tint carries
 * elevation). `tone="accent"|"secondary"` swap the fill; `outlined` is a white
 * surface + warm hairline; `elevated` adds a soft shadow; `hero` bumps to 28px.
 *
 * `platform="ios"` — an iOS inset-grouped card: a plain **white** surface, 14px
 * (continuous) corners, no tonal fill and no border, sitting on the grouped
 * background. `tone` still tints accent/secondary feature cards. Native
 * equivalent: a SwiftUI `.background(.regularMaterial)` / grouped `List` section.
 */
const TONE = {
  surface: {
    background: 'var(--role-surface-1)',
    color: 'var(--role-on-surface)'
  },
  accent: {
    background: 'var(--role-accent-container)',
    color: 'var(--role-on-accent-container)'
  },
  secondary: {
    background: 'var(--role-secondary-container)',
    color: 'var(--role-on-secondary-container)'
  }
};
function Card({
  children,
  tone = 'surface',
  platform = 'material',
  outlined = false,
  elevated = false,
  hero = false,
  padding = 16,
  className = '',
  style = {},
  onClick
}) {
  const ios = platform === 'ios';
  const t = TONE[tone] || TONE.surface;
  const isPlain = outlined || elevated;
  if (ios) {
    const tinted = tone === 'accent' || tone === 'secondary';
    return /*#__PURE__*/React.createElement("div", {
      className: className,
      onClick: onClick,
      style: {
        background: tinted ? t.background : 'var(--role-surface)',
        color: tinted ? t.color : 'var(--role-on-surface)',
        border: 'none',
        borderRadius: hero ? 18 : 14,
        padding,
        boxShadow: tinted ? 'none' : '0 1px 3px rgba(38,24,15,0.05), 0 8px 22px -10px rgba(38,24,15,0.13), 0 0 0 0.5px rgba(38,24,15,0.05)',
        ...style
      }
    }, children);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    onClick: onClick,
    style: {
      background: isPlain ? 'var(--role-surface)' : t.background,
      color: isPlain ? 'var(--role-on-surface)' : t.color,
      border: outlined ? '1px solid var(--role-outline)' : '1px solid transparent',
      borderRadius: hero ? 'var(--radius-hero)' : 'var(--radius-card)',
      padding,
      boxShadow: elevated ? 'var(--shadow-sm)' : 'none',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Chip.jsx
try { (() => {
/**
 * Chip — filter / single-choice chip.
 *
 * `platform="material"` (default): M3 filter chip — unselected is an outlined
 * surface, selected fills with the secondary container and shows a leading
 * check. 12px radius, 13.5/700.
 *
 * `platform="ios"`: a HIG capsule tag — full-radius pill, no check; unselected is
 * a filled gray (systemGray6), selected fills with the accent (tinted). 15/600.
 * Native equivalent: a SwiftUI capsule toggle / iOS filter pill.
 *
 * For a full-width segmented filter reach for SegmentedButton instead.
 */
function Chip({
  label,
  children,
  selected = false,
  disabled = false,
  showCheck = true,
  platform = 'material',
  onClick,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": selected,
      disabled: disabled,
      onClick: onClick,
      className: className,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 14px',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        background: selected ? 'var(--role-accent)' : 'var(--role-surface-3)',
        color: selected ? 'var(--role-on-accent)' : 'var(--role-on-surface)',
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color .12s ease, color .12s ease',
        WebkitTapHighlightColor: 'transparent',
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", null, label ?? children));
  }
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": selected,
    disabled: disabled,
    onClick: onClick,
    className: className,
    "data-m3-state": !disabled ? '' : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minHeight: 32,
      padding: selected && showCheck ? '7px 14px 7px 10px' : '7px 14px',
      borderRadius: 'var(--radius-sm)',
      border: selected ? '1px solid transparent' : '1px solid var(--role-outline)',
      background: selected ? 'var(--role-secondary-container)' : 'transparent',
      color: selected ? 'var(--role-on-secondary-container)' : 'var(--role-on-surface-variant)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13.5px',
      fontWeight: 600,
      lineHeight: 1.2,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color .12s ease, border-color .12s ease',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, selected && showCheck ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  })) : null, /*#__PURE__*/React.createElement("span", null, label ?? children));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Chip.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Divider.jsx
try { (() => {
/**
 * Divider — a hairline separator between rows or sections.
 *
 * `platform="material"` (default): a 1px line; `inset` indents it past a row's
 * leading element, `vertical` separates inline content.
 *
 * `platform="ios"`: a **0.5px** hairline with the iOS separator inset (defaults
 * to 16px on horizontal lines) — the UITableView cell separator.
 *
 * Native equivalent: a thin `View` (`bg-z-border`); on iOS the table-view
 * separator with `separatorInset`.
 */
function Divider({
  vertical = false,
  inset,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const thickness = ios ? 0.5 : 1;
  const horizInset = inset != null ? inset : ios ? 16 : 0;
  if (vertical) {
    return /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      className: className,
      style: {
        width: thickness,
        alignSelf: 'stretch',
        background: 'var(--role-outline)',
        ...style
      }
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: className,
    style: {
      height: 0,
      borderTop: `${thickness}px solid var(--role-outline)`,
      marginLeft: horizInset,
      ...style
    }
  });
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Divider.jsx", error: String((e && e.message) || e) }); }

// components/data-display/IconTile.jsx
try { (() => {
/**
 * IconTile — a rounded-square container holding an icon, used as the leading
 * element of section headers and list rows.
 *
 * Native equivalent: the app's `ZIconTile`. Tones map to the role tokens:
 * `neutral` (surface), `accent` (ember container), `secondary` (tan container).
 */
const ICONTILE_TONE = {
  neutral: {
    bg: 'var(--role-surface-2)',
    fg: 'var(--role-on-surface-variant)'
  },
  accent: {
    bg: 'var(--role-accent-container)',
    fg: 'var(--role-on-accent-container)'
  },
  secondary: {
    bg: 'var(--role-secondary-container)',
    fg: 'var(--role-on-secondary-container)'
  }
};
function IconTile({
  icon,
  tone = 'neutral',
  size = 40,
  radius = 12,
  className = '',
  style = {}
}) {
  const t = ICONTILE_TONE[tone] || ICONTILE_TONE.neutral;
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: radius,
      background: t.bg,
      color: t.fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, icon);
}
Object.assign(__ds_scope, { IconTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/IconTile.jsx", error: String((e && e.message) || e) }); }

// components/data-display/ListItem.jsx
try { (() => {
/**
 * ListItem — one row in a list: optional leading (icon tile / avatar), a title
 * with optional subtitle, and optional trailing content (chevron, badge, switch).
 *
 * `platform="material"` (default): an M3 row — 15/700 title, 13px subtitle, a
 * tile radius and a tonal selected fill. Lay rows on a Card and separate them
 * with <Divider>.
 *
 * `platform="ios"`: a UITableView **grouped cell** — square corners (the
 * enclosing card clips), taller padding, a **regular-weight 17px** title and
 * 15px secondary subtitle, with a system-gray pressed/selected highlight.
 *
 * Native equivalent: a `Pressable` row (`ZListItem`) → Android list row / iOS
 * `UITableViewCell`.
 */
function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  platform = 'material',
  selected = false,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  return /*#__PURE__*/React.createElement(Tag, {
    onClick: onClick,
    "aria-pressed": interactive ? selected : undefined,
    className: className,
    "data-m3-state": interactive && !ios ? '' : undefined,
    style: {
      all: interactive ? 'unset' : undefined,
      position: interactive && !ios ? 'relative' : undefined,
      overflow: interactive && !ios ? 'hidden' : undefined,
      boxSizing: 'border-box',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: ios ? 13 : 12,
      padding: ios ? '11px 16px' : '10px 12px',
      borderRadius: ios ? 0 : 'var(--radius-tile)',
      background: selected ? ios ? 'var(--role-surface-3)' : 'var(--role-surface-1)' : 'transparent',
      cursor: interactive ? 'pointer' : 'default',
      textAlign: 'left',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, leading != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex'
    }
  }, leading) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: ios ? 1 : 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: ios ? 17 : 15,
      fontWeight: ios ? 400 : 700,
      letterSpacing: ios ? '-0.01em' : 'normal',
      color: 'var(--role-on-surface)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), subtitle != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: ios ? 15 : 13,
      color: 'var(--role-on-surface-variant)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, subtitle) : null), trailing != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, trailing) : null);
}
Object.assign(__ds_scope, { ListItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/ListItem.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Dialog — modal confirm/alert centered over the screen with a scrim.
 *
 * `platform="material"` (default): an M3 AlertDialog — a wide rounded card, the
 * title and body left-aligned, text buttons bottom-right (`tone="danger"`
 * colors the confirm fill).
 *
 * `platform="ios"`: a HIG `UIAlertController` alert — a narrow (270px) centered
 * card with center-aligned title/message and full-width tappable buttons split
 * by hairlines (side-by-side for two, the preferred action bold,
 * `tone="danger"` rendering the confirm in red).
 *
 * Native equivalent: the app's `ZConfirmDialog` (RN `Modal` + M3 `AlertDialog`
 * / iOS `UIAlertController`). Renders nothing when `open` is false. Tapping the
 * scrim or the cancel button calls `onCancel`. Extra body content can be passed
 * as children. NOTE: positioned `absolute` so it overlays inside a phone-frame
 * mock; in production this is the native `Modal` z-layer.
 */
function Dialog({
  open = false,
  title,
  description,
  children,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  tone = 'default',
  platform = 'material',
  onConfirm,
  onCancel
}) {
  if (!open) return null;
  const ios = platform === 'ios';
  if (ios) {
    const danger = tone === 'danger';
    const hasCancel = !!cancelLabel;
    const hasConfirm = !!confirmLabel;
    const sideBySide = hasCancel && hasConfirm;
    const btnBase = {
      all: 'unset',
      boxSizing: 'border-box',
      flex: 1,
      textAlign: 'center',
      cursor: 'pointer',
      height: 44,
      lineHeight: '44px',
      fontFamily: 'var(--font-sans)',
      fontSize: 17,
      WebkitTapHighlightColor: 'transparent'
    };
    return /*#__PURE__*/React.createElement("div", {
      role: "dialog",
      "aria-modal": "true",
      onClick: onCancel,
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(20,12,6,.45)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        width: 270,
        boxSizing: 'border-box',
        background: 'var(--role-surface)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '19px 16px 16px',
        textAlign: 'center'
      }
    }, title != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 600,
        color: 'var(--role-on-surface)',
        letterSpacing: '-0.01em'
      }
    }, title) : null, description != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 3,
        fontSize: 13,
        lineHeight: 1.35,
        color: 'var(--role-on-surface)'
      }
    }, description) : null, children), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        borderTop: '0.5px solid var(--role-outline)'
      }
    }, hasCancel ? /*#__PURE__*/React.createElement("button", {
      onClick: onCancel,
      style: {
        ...btnBase,
        fontWeight: danger ? 600 : 400,
        color: 'var(--role-accent)'
      }
    }, cancelLabel) : null, hasConfirm ? /*#__PURE__*/React.createElement("button", {
      onClick: onConfirm,
      style: {
        ...btnBase,
        borderLeft: sideBySide ? '0.5px solid var(--role-outline)' : 'none',
        fontWeight: danger ? 400 : 600,
        color: danger ? 'var(--role-danger)' : 'var(--role-accent)'
      }
    }, confirmLabel) : null)));
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: onCancel,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'rgba(20,12,6,.45)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 340,
      boxSizing: 'border-box',
      background: 'var(--role-surface)',
      borderRadius: 'var(--radius-2xl)',
      padding: 24,
      boxShadow: 'var(--shadow-lg)'
    }
  }, title != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 500,
      lineHeight: 1.25,
      color: 'var(--role-on-surface)',
      letterSpacing: '-0.01em'
    }
  }, title) : null, description != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--role-on-surface-variant)'
    }
  }, description) : null, children, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 4
    }
  }, cancelLabel ? /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    "data-m3-state": "",
    style: {
      all: 'unset',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      padding: '10px 12px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--role-on-surface-variant)'
    }
  }, cancelLabel) : null, confirmLabel ? /*#__PURE__*/React.createElement("button", {
    onClick: onConfirm,
    "data-m3-state": "",
    style: {
      all: 'unset',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
      padding: '10px 12px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: tone === 'danger' ? 'var(--role-danger)' : 'var(--role-accent-strong)'
    }
  }, confirmLabel) : null)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
/**
 * EmptyState — dashed-border placeholder for empty lists/sections. Mirrors
 * ZEmptyState: warm icon tile, title, description, optional action slot.
 */
function EmptyState({
  title,
  description,
  icon,
  children,
  className = '',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '32px 20px',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--role-outline)',
      background: 'var(--role-surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--role-surface-variant)',
      color: 'var(--z-primary)'
    }
  }, icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '16px 0 0',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--role-on-surface)'
    }
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0 0',
      maxWidth: 360,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.5,
      color: 'var(--role-on-surface-variant)'
    }
  }, description) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, children) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
/**
 * ProgressBar — linear determinate progress.
 *
 * `platform="material"` (default): a 6px rounded M3 track (--role-outline tint)
 * with an accent fill.
 *
 * `platform="ios"`: a thin **4px** `UIProgressView` — a lighter (systemGray5)
 * track with the accent (or success) fill. `value` is 0–1 (or 0–100 with
 * `max={100}`).
 */
function ProgressBar({
  value = 0,
  max = 1,
  height = 6,
  tone = 'accent',
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const pct = Math.max(0, Math.min(1, max ? value / max : 0)) * 100;
  const fill = tone === 'success' ? 'var(--role-success)' : 'var(--role-accent)';
  const h = ios && height === 6 ? 4 : height;
  return /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": Math.round(pct),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    className: className,
    style: {
      height: h,
      borderRadius: 'var(--radius-full)',
      background: ios ? 'var(--role-surface-4)' : 'var(--role-outline)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + '%',
      height: '100%',
      borderRadius: 'var(--radius-full)',
      background: fill,
      transition: 'width .3s ease'
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
/**
 * Skeleton — shimmering placeholder block for loading states. Mirrors
 * ZSkeleton. Size it with width/height (or className); radius defaults to md.
 */
function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--radius-md)',
  className = '',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: className,
    style: {
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--role-surface-variant) 25%, var(--z-surface-muted) 37%, var(--role-surface-variant) 63%)',
      backgroundSize: '400% 100%',
      animation: 'strido-shimmer 1.4s ease infinite',
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes strido-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}`));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Snackbar.jsx
try { (() => {
/**
 * Snackbar — a transient message, optionally with a single action.
 *
 * `platform="material"` (default): the M3 Snackbar — a dark inverse-surface pill
 * anchored to the **bottom**, with an accent action label. Native: `showToast`.
 *
 * `platform="ios"`: iOS has **no** bottom snackbar, so this renders the closest
 * native idiom — a light **banner** dropped from the **top**: an opaque surface
 * card with a soft shadow, a leading status dot, the message, and an optional
 * tinted action link. (On device this maps to a notification banner / a custom
 * toast overlay rather than a UIKit control.) Renders nothing when `open` is
 * false. NOTE: positioned `absolute` so it sits inside a phone-frame mock.
 */
const SNACK_DOT = {
  success: 'var(--role-success)',
  danger: 'var(--role-danger)'
};
function Snackbar({
  open = false,
  message,
  actionLabel,
  onAction,
  tone = 'default',
  platform = 'material'
}) {
  if (!open) return null;
  const ios = platform === 'ios';
  const dot = SNACK_DOT[tone];
  if (ios) {
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      style: {
        position: 'absolute',
        left: 12,
        right: 12,
        top: 14,
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '13px 16px',
        borderRadius: 16,
        background: 'var(--role-surface)',
        color: 'var(--role-on-surface)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-sans)'
      }
    }, dot ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 999,
        background: dot,
        flexShrink: 0
      }
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 1.35,
        letterSpacing: '-0.01em'
      }
    }, message), actionLabel ? /*#__PURE__*/React.createElement("button", {
      onClick: onAction,
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--role-accent)',
        flexShrink: 0
      }
    }, actionLabel) : null);
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      zIndex: 70,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '13px 16px',
      borderRadius: 4,
      background: 'var(--role-on-surface)',
      color: 'var(--role-surface)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-sans)'
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: dot,
      flexShrink: 0
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.4
    }
  }, message), actionLabel ? /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      all: 'unset',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--role-accent)',
      flexShrink: 0
    }
  }, actionLabel) : null);
}
Object.assign(__ds_scope, { Snackbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Snackbar.jsx", error: String((e && e.message) || e) }); }

// components/forms/FieldLabel.jsx
try { (() => {
/**
 * FieldLabel — label above a field.
 *
 * `platform="material"` (default): a 14px / 600 label in the on-surface color.
 *
 * `platform="ios"`: a grouped-form **section header** — 13px / 600 uppercase in
 * the muted role with letter-spacing, indented to the iOS group inset. Native
 * equivalent: a `UITableView` section header / SwiftUI `Section` header.
 */
function FieldLabel({
  children,
  htmlFor,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    className: className,
    style: ios ? {
      display: 'block',
      margin: '0 0 7px 16px',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: 'var(--role-on-surface-variant)',
      ...style
    } : {
      display: 'block',
      marginBottom: 4,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--role-on-surface)',
      ...style
    }
  }, children);
}

/** FieldError — inline danger message below a field. */
function FieldError({
  children,
  className = '',
  style = {}
}) {
  if (!children) return null;
  return /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: className,
    style: {
      margin: '4px 0 0',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 500,
      color: 'var(--z-danger)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { FieldLabel, FieldError });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FieldLabel.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/**
 * Select — single-choice dropdown field. Mirrors the app's `ZSelect`.
 *
 * `platform="material"` (default): a **Material 3 outlined** select — matching
 * the app's Compose `OutlinedTextField`: a full rounded border on a surface fill
 * that turns 2dp accent on focus, plus a single down chevron (matches TextInput).
 *
 * `platform="ios"`: a HIG menu button — a filled gray surface, no border, 10px
 * corners, 17px text and the iOS up/down **double chevron** tinted with the
 * accent. Native equivalent: `ZSelect` → iOS `UIMenu` button / SwiftUI `Picker`.
 * For a small, fixed set prefer <Chip> or <SegmentedButton>.
 */
function Select({
  value,
  options = [],
  placeholder = '',
  onChange,
  invalid = false,
  disabled = false,
  platform = 'material',
  ariaLabel,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const [focus, setFocus] = React.useState(false);
  const ringColor = invalid ? 'var(--z-danger)' : focus ? 'var(--role-accent)' : 'var(--role-outline)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value ?? '',
    disabled: disabled,
    "aria-label": ariaLabel,
    "aria-invalid": invalid || undefined,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    className: className,
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      minHeight: ios ? 44 : 56,
      padding: ios ? '11px 40px 11px 12px' : '0 40px 0 16px',
      borderRadius: ios ? 10 : 'var(--radius-md)',
      border: ios ? invalid ? '1px solid var(--z-danger)' : '1px solid transparent' : `1px solid ${ringColor}`,
      boxShadow: ios || !focus ? 'none' : `inset 0 0 0 1px ${ringColor}`,
      background: ios ? disabled ? 'var(--role-surface-variant)' : 'var(--role-surface-3)' : disabled ? 'var(--role-surface-variant)' : 'var(--role-surface)',
      color: value ? 'var(--role-on-surface)' : 'var(--role-on-surface-variant)',
      fontFamily: 'var(--font-sans)',
      fontSize: ios ? 17 : 'var(--text-base)',
      outline: 'none',
      boxSizing: 'border-box',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, placeholder ? /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder) : null, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: ios ? 'var(--role-accent)' : 'var(--role-on-surface-variant)',
      display: 'inline-flex'
    }
  }, ios ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "8 9 12 5 16 9"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8 15 12 19 16 15"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/**
 * Switch — on/off toggle.
 *
 * `platform="material"` (default): Material 3 — the track fills with the accent
 * when on; the thumb grows from a small dot (off) to a filled circle (on), with
 * a 2px outline track when off.
 *
 * `platform="ios"`: a HIG `UISwitch` — a borderless 51×31 track (tinted with the
 * brand accent when on, neutral gray when off) and a fixed 27px white thumb that
 * slides, lifted by a soft shadow.
 *
 * Native equivalent: React Native `Switch` renders the platform control
 * natively (iOS `UISwitch` / Android M3 Switch); exposed as `ZSwitch`. Use in
 * settings rows as a <ListItem> `trailing`.
 */
function Switch({
  checked = false,
  onChange,
  platform = 'material',
  disabled = false,
  ariaLabel,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    return /*#__PURE__*/React.createElement("button", {
      role: "switch",
      "aria-checked": checked,
      "aria-label": ariaLabel,
      disabled: disabled,
      onClick: () => !disabled && onChange && onChange(!checked),
      className: className,
      style: {
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: 51,
        height: 31,
        borderRadius: 999,
        boxSizing: 'border-box',
        position: 'relative',
        flexShrink: 0,
        background: checked ? 'var(--role-accent)' : 'var(--role-surface-4)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color .2s ease',
        WebkitTapHighlightColor: 'transparent',
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 2,
        left: checked ? 22 : 2,
        width: 27,
        height: 27,
        borderRadius: 999,
        background: '#ffffff',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)',
        transition: 'left .2s ease'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": checked,
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    className: className,
    style: {
      all: 'unset',
      cursor: disabled ? 'not-allowed' : 'pointer',
      width: 52,
      height: 32,
      borderRadius: 999,
      boxSizing: 'border-box',
      position: 'relative',
      flexShrink: 0,
      background: checked ? 'var(--role-accent)' : 'var(--role-surface-4)',
      border: `2px solid ${checked ? 'var(--role-accent)' : 'var(--role-outline)'}`,
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color .15s ease, border-color .15s ease',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '50%',
      left: checked ? 24 : 5,
      transform: 'translateY(-50%)',
      width: checked ? 22 : 16,
      height: checked ? 22 : 16,
      borderRadius: 999,
      background: checked ? 'var(--role-on-accent)' : 'var(--role-outline)',
      transition: 'left .15s ease, width .15s ease, height .15s ease, background-color .15s ease'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
/**
 * TextInput — single-line field.
 *
 * `platform="material"` (default): a **Material 3 outlined text field** —
 * matching the app's Compose `OutlinedTextField`: a full rounded border on a
 * surface fill that turns **2dp accent on focus** (rendered as a border +
 * inset ring so there is no layout shift), `invalid` turns it danger. 56dp min
 * height. Pair with an external <FieldLabel> above.
 *
 * `platform="ios"`: a HIG rounded field — a filled gray surface (systemGray6),
 * **no border**, 10px corners and 17px text; invalid adds a danger hairline.
 * Native equivalent: `UITextField(.roundedRect)` / SwiftUI `.textFieldStyle`.
 */
function TextInput({
  value,
  onChange,
  placeholder = '',
  invalid = false,
  disabled = false,
  platform = 'material',
  type = 'text',
  ariaLabel,
  className = '',
  style = {},
  onKeyDown
}) {
  const ios = platform === 'ios';
  const [focus, setFocus] = React.useState(false);
  const ringColor = invalid ? 'var(--z-danger)' : focus ? 'var(--role-accent)' : 'var(--role-outline)';
  return /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onKeyDown: onKeyDown,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    placeholder: placeholder,
    "aria-label": ariaLabel,
    "aria-invalid": invalid || undefined,
    disabled: disabled,
    className: className,
    style: {
      width: '100%',
      minHeight: ios ? 44 : 56,
      padding: ios ? '11px 12px' : '0 16px',
      borderRadius: ios ? 10 : 'var(--radius-md)',
      border: ios ? invalid ? '1px solid var(--z-danger)' : '1px solid transparent' : `1px solid ${ringColor}`,
      boxShadow: ios || !focus ? 'none' : `inset 0 0 0 1px ${ringColor}`,
      background: ios ? disabled ? 'var(--role-surface-variant)' : 'var(--role-surface-3)' : disabled ? 'var(--role-surface-variant)' : 'var(--role-surface)',
      color: disabled ? 'var(--role-on-surface-variant)' : 'var(--role-on-surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: ios ? 17 : 'var(--text-base)',
      outline: 'none',
      boxSizing: 'border-box',
      ...style
    }
  });
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
/**
 * Textarea — multi-line field for comments, descriptions, reasons.
 *
 * `platform="material"` (default): a **Material 3 outlined field** matching the
 * app's Compose `OutlinedTextField` — a full rounded border on a surface fill
 * that turns **2dp accent on focus** (no bottom-only indicator). `platform="ios"`:
 * filled gray surface, no border, 10px corners, 17px text. `rows` sets height.
 */
function Textarea({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  invalid = false,
  disabled = false,
  platform = 'material',
  ariaLabel,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const [focus, setFocus] = React.useState(false);
  const ringColor = invalid ? 'var(--z-danger)' : focus ? 'var(--role-accent)' : 'var(--role-outline)';
  return /*#__PURE__*/React.createElement("textarea", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    placeholder: placeholder,
    rows: rows,
    "aria-label": ariaLabel,
    "aria-invalid": invalid || undefined,
    disabled: disabled,
    className: className,
    style: {
      width: '100%',
      padding: ios ? '11px 12px' : '11px 16px',
      borderRadius: ios ? 10 : 'var(--radius-md)',
      border: ios ? invalid ? '1px solid var(--z-danger)' : '1px solid transparent' : `1px solid ${ringColor}`,
      boxShadow: ios || !focus ? 'none' : `inset 0 0 0 1px ${ringColor}`,
      background: ios ? disabled ? 'var(--role-surface-variant)' : 'var(--role-surface-3)' : disabled ? 'var(--role-surface-variant)' : 'var(--role-surface)',
      color: disabled ? 'var(--role-on-surface-variant)' : 'var(--role-on-surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: ios ? 17 : 'var(--text-base)',
      lineHeight: 1.5,
      outline: 'none',
      resize: 'vertical',
      boxSizing: 'border-box',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/LargeTitleBar.jsx
try { (() => {
/**
 * LargeTitleBar — the screen header / top navigation bar.
 *
 * `platform="ios"` (default): a HIG `UINavigationBar` with a **large title**
 * (34/800), an optional uppercase eyebrow above it, trailing action icon-buttons
 * tinted with the accent, and an optional inset search field below (the iOS
 * "scroll-to-reveal" search pattern). Native equivalent: SwiftUI
 * `.navigationBarTitleDisplayMode(.large)` + `.searchable`.
 *
 * `platform="material"`: a compact M3 top app bar — a 22/800 title on the left,
 * action icons on the right, optional search field below. Native equivalent:
 * M3 `TopAppBar`.
 *
 * Actions are `{ id, icon, label, onPress }`; icons are nodes (e.g. Lucide).
 * The search field is uncontrolled unless you pass `searchValue`/`onSearch`.
 */
function LargeTitleBar({
  title,
  eyebrow,
  actions = [],
  showSearch = false,
  searchPlaceholder = 'Suchen',
  searchValue,
  onSearch,
  platform = 'ios',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const actionRow = actions.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      paddingBottom: ios ? 4 : 0
    }
  }, actions.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: a.id || i,
    type: "button",
    "aria-label": a.label,
    onClick: a.onPress,
    style: {
      width: 38,
      height: 38,
      border: 'none',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--role-accent)',
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent'
    }
  }, a.icon))) : null;
  const searchField = showSearch ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: ios ? '4px 16px 10px' : '0 16px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      height: 36,
      padding: '0 10px',
      borderRadius: 10,
      background: 'var(--role-surface-3)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--role-on-surface-variant)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: searchPlaceholder,
    value: searchValue,
    onChange: onSearch ? e => onSearch(e.target.value) : undefined,
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 17,
      color: 'var(--role-on-surface)'
    }
  }))) : null;
  if (ios) {
    return /*#__PURE__*/React.createElement("div", {
      className: className,
      style: {
        background: 'var(--role-background)',
        fontFamily: 'var(--font-sans)',
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 16px 6px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, eyebrow ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--role-on-surface-variant)',
        marginBottom: 2
      }
    }, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 34,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        color: 'var(--role-on-surface)'
      }
    }, title)), actionRow), searchField);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      background: 'var(--role-background)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 12px 10px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      minWidth: 0
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--role-on-surface-variant)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: 'var(--role-on-surface)'
    }
  }, title)), actionRow), searchField);
}
Object.assign(__ds_scope, { LargeTitleBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/LargeTitleBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavigationBar.jsx
try { (() => {
/**
 * NavigationBar — bottom navigation.
 *
 * `platform="material"` (default): Material 3 bottom nav — each item is an icon
 * above a label; the active item's icon sits inside a pill-shaped
 * secondary-container indicator.
 *
 * `platform="ios"`: a HIG `UITabBar` — no pill; the active item simply tints its
 * icon + label with the accent, inactive items use the muted role. A 0.5px
 * hairline tops the (opaque) bar; pass `safeArea` to add the home-indicator
 * inset. Native equivalent: React Navigation native bottom tabs /
 * `react-native-bottom-tabs`; the same `items`/`activeId` contract maps to
 * `.ios.tsx`.
 *
 * Pass icons as nodes (e.g. 22–25px Lucide icons) or a render function
 * `({ selected, color }) => node` so the icon tints to the active/inactive role.
 */
function NavigationBar({
  items = [],
  activeId,
  onChange,
  platform = 'material',
  safeArea = false,
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    return /*#__PURE__*/React.createElement("nav", {
      className: className,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        background: 'var(--role-surface)',
        borderTop: '0.5px solid var(--role-outline)',
        padding: safeArea ? '8px 4px 20px' : '8px 4px 6px',
        fontFamily: 'var(--font-sans)',
        ...style
      }
    }, items.map(item => {
      const selected = item.id === activeId;
      const tint = selected ? 'var(--role-accent)' : 'var(--role-on-surface-variant)';
      return /*#__PURE__*/React.createElement("button", {
        key: item.id,
        type: "button",
        "aria-current": selected ? 'page' : undefined,
        "aria-label": item.label,
        onClick: () => onChange && onChange(item.id),
        style: {
          flex: '0 0 auto',
          width: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: tint,
          WebkitTapHighlightColor: 'transparent'
        }
      }, typeof item.icon === 'function' ? item.icon({
        selected,
        color: tint
      }) : item.icon, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: '10px',
          fontWeight: selected ? 600 : 500,
          color: tint
        }
      }, item.label));
    }));
  }
  return /*#__PURE__*/React.createElement("nav", {
    className: className,
    style: {
      display: 'flex',
      background: 'var(--role-surface-2)',
      padding: '12px 0 16px',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, items.map(item => {
    const selected = item.id === activeId;
    const tint = selected ? 'var(--role-on-secondary-container)' : 'var(--role-on-surface-variant)';
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      type: "button",
      "aria-current": selected ? 'page' : undefined,
      "aria-label": item.label,
      "data-m3-state": "",
      onClick: () => onChange && onChange(item.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        WebkitTapHighlightColor: 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 64,
        height: 32,
        borderRadius: 'var(--radius-full)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selected ? 'var(--role-secondary-container)' : 'transparent',
        color: tint
      }
    }, typeof item.icon === 'function' ? item.icon({
      selected,
      color: tint
    }) : item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '12px',
        fontWeight: selected ? 600 : 500,
        color: selected ? 'var(--role-on-surface)' : 'var(--role-on-surface-variant)'
      }
    }, item.label));
  }));
}
Object.assign(__ds_scope, { NavigationBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavigationBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedButton.jsx
try { (() => {
/**
 * SegmentedButton — single-choice segmented filter row.
 *
 * `platform="material"` (default): Material 3 — pill-shaped row, hairline
 * dividers, the selected segment fills with the secondary container and shows a
 * leading check.
 *
 * `platform="ios"`: a HIG `UISegmentedControl` — a gray track (no outer border,
 * no dividers) with a white rounded pill (soft shadow) sliding under the
 * selected segment; selected label 600, others 500, no check. Native
 * equivalent: `@react-native-segmented-control/segmented-control` /
 * SwiftUI `Picker(.segmented)`; the same `segments`/`activeId` contract maps to
 * `.ios.tsx`.
 *
 * The full-width filter used across Strido (Videos: Alle · Zu prüfen · Geprüft).
 * For a scrollable set of independent toggles use Chip; for secondary
 * underline tabs use Tabs.
 */
function SegmentedButton({
  segments = [],
  activeId,
  onChange,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    return /*#__PURE__*/React.createElement("div", {
      role: "tablist",
      className: className,
      style: {
        display: 'flex',
        gap: 2,
        padding: 2,
        borderRadius: 9,
        background: 'var(--role-surface-4)',
        fontFamily: 'var(--font-sans)',
        ...style
      }
    }, segments.map(seg => {
      const selected = seg.id === activeId;
      return /*#__PURE__*/React.createElement("button", {
        key: seg.id,
        role: "tab",
        "aria-selected": selected,
        onClick: () => onChange && onChange(seg.id),
        style: {
          flex: 1,
          border: 'none',
          cursor: 'pointer',
          height: 30,
          borderRadius: 7,
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: selected ? 600 : 500,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          color: selected ? 'var(--role-on-surface)' : 'var(--role-on-surface-variant)',
          background: selected ? 'var(--role-surface)' : 'transparent',
          boxShadow: selected ? '0 1px 3px rgba(38,24,15,0.16), 0 1px 1px rgba(38,24,15,0.06)' : 'none',
          transition: 'background .12s ease, color .12s ease',
          WebkitTapHighlightColor: 'transparent'
        }
      }, seg.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    className: className,
    style: {
      display: 'flex',
      height: 40,
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--role-outline)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, segments.map((seg, i) => {
    const selected = seg.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: seg.id,
      role: "tab",
      "aria-selected": selected,
      "data-m3-state": "",
      onClick: () => onChange && onChange(seg.id),
      style: {
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        padding: '0 12px',
        background: selected ? 'var(--role-secondary-container)' : 'transparent',
        color: selected ? 'var(--role-on-secondary-container)' : 'var(--role-on-surface-variant)',
        border: 'none',
        borderLeft: i ? '1px solid var(--role-outline)' : 'none',
        fontFamily: 'inherit',
        fontSize: '13.5px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent'
      }
    }, selected ? /*#__PURE__*/React.createElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "20 6 9 17 4 12"
    })) : null, /*#__PURE__*/React.createElement("span", null, seg.label));
  }));
}
Object.assign(__ds_scope, { SegmentedButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedButton.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Stepper.jsx
try { (() => {
/**
 * Stepper — multi-step progress for guided flows (booking, upload).
 *
 * `platform="material"` (default): ZStepper — numbered circles (ember-filled +
 * check when done, ember-ringed when active, dimmed upcoming) connected by rules,
 * with a label under each.
 *
 * `platform="ios"`: a `UIPageControl` — a centered row of dots (the active dot
 * elongates into an accent pill, done dots are accent, upcoming are gray), with
 * the active step's label centered beneath. Native equivalent: SwiftUI
 * `.tabViewStyle(.page)` indicator.
 */
function Stepper({
  steps = [],
  onStepPress,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    const activeStep = steps.find(s => s.state === 'active') || steps.find(s => s.state !== 'completed');
    return /*#__PURE__*/React.createElement("div", {
      className: className,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, steps.map((step, i) => {
      const active = step.state === 'active';
      const done = step.state === 'completed';
      const on = active || done;
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        type: "button",
        "aria-label": step.label,
        "aria-current": active ? 'step' : undefined,
        onClick: () => onStepPress && onStepPress(i),
        style: {
          all: 'unset',
          cursor: onStepPress ? 'pointer' : 'default',
          height: 7,
          width: active ? 20 : 7,
          borderRadius: 'var(--radius-full)',
          background: on ? 'var(--role-accent)' : 'var(--role-outline)',
          transition: 'width .2s ease, background-color .2s ease'
        }
      });
    })), activeStep ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: 'var(--role-on-surface)'
      }
    }, activeStep.label) : null);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      ...style
    }
  }, steps.map((step, i) => {
    const done = step.state === 'completed';
    const active = step.state === 'active';
    const upcoming = step.state === 'upcoming';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'flex-start'
      }
    }, i > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        height: 2,
        width: 32,
        background: upcoming ? 'var(--role-outline)' : 'var(--z-primary)'
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": step.label,
      disabled: upcoming,
      onClick: () => onStepPress && onStepPress(i),
      style: {
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-full)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${upcoming ? 'var(--role-outline)' : 'var(--z-primary)'}`,
        background: done ? 'var(--z-primary)' : 'var(--role-surface)',
        opacity: upcoming ? 0.5 : 1,
        cursor: upcoming ? 'default' : 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 700,
        color: active ? 'var(--z-primary)' : 'var(--role-on-surface-variant)'
      }
    }, done ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 1
      }
    }, "\u2713") : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: active ? 600 : 400,
        color: done ? 'var(--z-primary)' : active ? 'var(--role-on-surface)' : 'var(--role-on-surface-variant)'
      }
    }, step.label)));
  }));
}
Object.assign(__ds_scope, { Stepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Stepper.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Tabs — horizontal tab bar for top-level view switching.
 *
 * `platform="material"` (default): ZTabs — a left-aligned underline tab bar; the
 * active tab gets the ember underline + strong text, counts render as badges.
 *
 * `platform="ios"`: a centered, tinted page-tab bar — the active label is
 * accent-tinted with a short underline sized to the text (no full-width rule),
 * inactive labels are muted. (On iOS a top filter is often a SegmentedButton;
 * use this for App-Store-style page tabs.) Consumers render the active panel.
 */
function Tabs({
  tabs = [],
  activeId,
  onChange,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  if (ios) {
    return /*#__PURE__*/React.createElement("div", {
      role: "tablist",
      className: className,
      style: {
        display: 'flex',
        borderBottom: '0.5px solid var(--role-outline)',
        ...style
      }
    }, tabs.map(tab => {
      const selected = tab.id === activeId;
      return /*#__PURE__*/React.createElement("button", {
        key: tab.id,
        role: "tab",
        "aria-selected": selected,
        onClick: () => onChange && onChange(tab.id),
        style: {
          flex: 1,
          display: 'inline-flex',
          justifyContent: 'center',
          padding: '10px 8px 0',
          marginBottom: -0.5,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: selected ? 'var(--role-accent)' : 'var(--role-on-surface-variant)'
        }
      }, tab.label, tab.count !== undefined ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
        label: tab.count
      }) : null), /*#__PURE__*/React.createElement("span", {
        style: {
          height: 2.5,
          width: '100%',
          borderRadius: 'var(--radius-full)',
          background: selected ? 'var(--role-accent)' : 'transparent'
        }
      })));
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    className: className,
    style: {
      display: 'flex',
      borderBottom: '1px solid var(--role-outline)',
      ...style
    }
  }, tabs.map(tab => {
    const selected = tab.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      role: "tab",
      "aria-selected": selected,
      "data-m3-state": "",
      onClick: () => onChange && onChange(tab.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 12px',
        marginBottom: -1,
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${selected ? 'var(--z-primary)' : 'transparent'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        color: selected ? 'var(--role-on-surface)' : 'var(--role-on-surface-variant)',
        WebkitTapHighlightColor: 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", null, tab.label), tab.count !== undefined ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
      label: tab.count
    }) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopAppBar.jsx
try { (() => {
/**
 * TopAppBar — the screen's top bar.
 *
 * `platform="material"` (default): a **Material 3 small top app bar** — 64dp
 * tall on `surface`, a Title-Large (22px) title inset 16dp from the start (or
 * centered with `centered`), an optional `leading` node (e.g. a 48dp nav
 * IconButton) and trailing `actions`. Pass `actions` as
 * `[{ id, icon, label, onPress }]`; each renders as a ghost IconButton with the
 * shared M3 state layer. `trailing` is an escape hatch for an arbitrary right-
 * side node (a text button, a badged bell) when `actions` doesn't fit.
 *
 * `platform="ios"`: a HIG inline navigation bar — a 44pt min-height row with a
 * center-aligned 17/600 title and tinted leading/trailing controls. For the big
 * scrolling iOS title use <LargeTitleBar> instead.
 *
 * Native equivalent: Android M3 `TopAppBar` / iOS `UINavigationBar`.
 */
function TopAppBar({
  title,
  leading,
  actions = [],
  trailing,
  centered = false,
  platform = 'material',
  className = '',
  style = {}
}) {
  const ios = platform === 'ios';
  const ActionButtons = actions.map(a => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: a.id,
    platform: platform,
    variant: "ghost",
    size: ios ? 'md' : 'md',
    label: a.label,
    onClick: a.onPress
  }, a.icon));
  if (ios) {
    return /*#__PURE__*/React.createElement("nav", {
      className: className,
      style: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minHeight: 44,
        padding: '6px 8px',
        background: 'var(--role-surface)',
        fontFamily: 'var(--font-sans)',
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        zIndex: 1
      }
    }, leading), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 56,
        right: 56,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: 'var(--role-on-surface)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        pointerEvents: 'none'
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        zIndex: 1
      }
    }, ActionButtons, trailing));
  }
  return /*#__PURE__*/React.createElement("nav", {
    className: className,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      height: 64,
      padding: leading ? '0 4px' : '0 4px 0 16px',
      background: 'var(--role-surface)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, leading != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex'
    }
  }, leading) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 22,
      fontWeight: 500,
      letterSpacing: '-0.01em',
      color: 'var(--role-on-surface)',
      textAlign: centered ? 'center' : 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), ActionButtons.length || trailing != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  }, ActionButtons, trailing) : null);
}
Object.assign(__ds_scope, { TopAppBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopAppBar.jsx", error: String((e && e.message) || e) }); }

// design_handoff_home_videos/design-references/data.js
try { (() => {
// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: {
    name: 'Mia Halvorsen',
    initials: 'MH',
    role: 'Rider'
  },
  groups: [{
    id: 'g1',
    name: 'Nord Eventing Academy',
    initials: 'NE',
    members: 14
  }, {
    id: 'g2',
    name: 'Trail & Dressage Club',
    initials: 'TD',
    members: 9
  }],
  videos: [{
    id: 'v1',
    title: 'Combination line — take 2',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 3,
    duration: '0:48',
    desc: 'Two strides in, felt rushed to the oxer.'
  }, {
    id: 'v2',
    title: 'Sitting trot — long side',
    group: 'Trail & Dressage Club',
    gi: 'TD',
    status: 'completed',
    reviews: 6,
    duration: '1:22',
    desc: 'Working on a steadier contact.'
  }, {
    id: 'v3',
    title: 'Warm-up canter transitions',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 1,
    duration: '2:05',
    desc: 'Left lead pickup is sticky.'
  }, {
    id: 'v4',
    title: 'Grid work — bounce to one',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'waiting_upload',
    reviews: 0,
    duration: '0:36',
    desc: ''
  }],
  reviews: [{
    id: 'r1',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:12',
    when: '2h ago',
    body: 'Good rhythm on the approach — eyes up a stride earlier and the distance comes to you.'
  }, {
    id: 'r2',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:31',
    when: '2h ago',
    body: 'Here you tipped forward over the first element. Keep your shoulders back and let the horse close the gap.',
    replies: [{
      id: 'r2a',
      author: 'Mia Halvorsen',
      initials: 'MH',
      when: '1h ago',
      body: 'Makes sense — I felt the lean. Will drill it tomorrow.'
    }]
  }],
  bookings: [{
    id: 'b1',
    type: 'Video review session',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Tue 18 Jun · 16:00',
    mins: 30,
    status: 'pending',
    joinable: true
  }, {
    id: 'b2',
    type: 'Flatwork deep-dive',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Fri 21 Jun · 09:30',
    mins: 45,
    status: 'pending',
    joinable: false
  }, {
    id: 'b3',
    type: 'Jumping technique',
    who: 'Coach Lars',
    role: 'expert',
    when: 'Mon 10 Jun · 17:00',
    mins: 30,
    status: 'done',
    joinable: false,
    recording: 'ready'
  }, {
    id: 'b4',
    type: 'Course walk-through',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Thu 6 Jun · 14:00',
    mins: 30,
    status: 'cancelled',
    joinable: false,
    reason: 'Horse off work.'
  }],
  notifications: 2
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_home_videos/design-references/data.js", error: String((e && e.message) || e) }); }

// design_handoff_home_videos/design-references/material-home.jsx
try { (() => {
/* Strido — Material 3 home screen + Android device frame.
 * Material-native primitives that read per-frame --m-* theme tokens
 * (see material-themes.js). Exposes window.StridoMaterial.
 */
(function () {
  const D = window.StridoData;

  /* Lucide icon helper — renders an <i> that lucide.createIcons() swaps for an SVG. */
  function Icon({
    n,
    size = 20,
    color = 'currentColor',
    sw = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color,
        strokeWidth: sw,
        display: 'inline-flex',
        flexShrink: 0,
        ...style
      }
    });
  }

  /* ── Material state-layer pressable (ripple-ish hover) ─────────────────── */
  function Pressable({
    children,
    onClick,
    style,
    round,
    label
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      "aria-label": label,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        boxSizing: 'border-box',
        borderRadius: round ? 999 : 16,
        WebkitTapHighlightColor: 'transparent',
        ...style
      }
    }, children);
  }

  /* ── Android status bar ────────────────────────────────────────────────── */
  function StatusBar() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 34,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 22px',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '.01em'
      }
    }, "9:41"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "signal",
      size: 15,
      sw: 2.4
    }), /*#__PURE__*/React.createElement(Icon, {
      n: "wifi",
      size: 15,
      sw: 2.4
    }), /*#__PURE__*/React.createElement(Icon, {
      n: "battery-full",
      size: 20,
      sw: 2
    })));
  }

  /* ── Top app bar — personalised greeting (home) or plain title ─────────── */
  function TopBar({
    title,
    subtitle,
    avatar = true
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 14px'
      }
    }, avatar ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 999,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 800,
        flexShrink: 0
      }
    }, D.user.initials) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, subtitle ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--m-on-surface-variant)',
        lineHeight: 1.1
      }
    }, subtitle) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title)), /*#__PURE__*/React.createElement("button", {
      "aria-label": "Benachrichtigungen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--m-s2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 22,
      color: "var(--m-on-surface)",
      sw: 2
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        boxSizing: 'border-box',
        background: 'var(--m-primary)',
        color: 'var(--m-on-primary)',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        border: '2px solid var(--m-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, D.notifications) : null));
  }

  /* ── Hero — next session (filled primary-container card) ───────────────── */
  function HeroSession() {
    const b = D.bookings.find(x => x.status === 'pending') || D.bookings[0];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        padding: 18,
        borderRadius: 28,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        opacity: .9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "calendar-clock",
      size: 14,
      sw: 2.4
    }), "N\xE4chste Session"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: 'var(--m-surface)',
        color: 'var(--m-on-surface)'
      }
    }, "in 2 Tagen")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1.25
      }
    }, "Video-Review mit ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13.5,
        fontWeight: 600,
        opacity: .92
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 15,
      sw: 2.2
    }), b.when, " \xB7 ", b.mins, " Min"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 999,
        background: 'var(--m-primary)',
        color: 'var(--m-on-primary)',
        fontSize: 15,
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "video",
      size: 18,
      sw: 2.2
    }), "Beitreten"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        padding: '0 18px',
        borderRadius: 999,
        border: '1.5px solid currentColor',
        fontSize: 15,
        fontWeight: 700,
        opacity: .9
      }
    }, "Details")));
  }

  /* ── Section header ────────────────────────────────────────────────────── */
  function SectionHeader({
    title,
    action,
    onAction
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), action ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--m-primary)'
      }
    }, action) : null);
  }

  /* ── Video list item (filled tile) ─────────────────────────────────────── */
  function VideoItem({
    v
  }) {
    const done = v.status === 'completed';
    const chipBg = done ? 'var(--m-success-container)' : 'var(--m-secondary-container)';
    const chipFg = done ? 'var(--m-on-success-container)' : 'var(--m-on-secondary-container)';
    const chipLabel = done ? 'Geprüft' : 'In Prüfung';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: 10,
        borderRadius: 20,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 92,
        height: 62,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 22,
      color: "rgba(255,255,255,.92)",
      sw: 2.2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.55)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--m-on-surface)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--m-on-surface-variant)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: chipBg,
        color: chipFg
      }
    }, chipLabel), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: "var(--m-on-surface-variant)"
    }), v.reviews))));
  }

  /* ── First-steps progress card ─────────────────────────────────────────── */
  const STEPS = [{
    done: true,
    label: 'Gruppe erstellt',
    desc: 'Deine erste Gruppe ist bereit für Schüler und Videos.'
  }, {
    done: false,
    label: 'Erstes Video hochladen',
    desc: 'Teile ein Trainingsvideo, damit ein Experte es überprüfen kann.'
  }, {
    done: false,
    label: 'Eingereichte Videos überprüfen',
    desc: 'Videos von Schülern, die auf Feedback warten, erscheinen hier.'
  }, {
    done: false,
    label: 'Coaching-Verfügbarkeit festlegen',
    desc: 'Erstelle Terminarten und Verfügbarkeiten, damit Schüler buchen können.'
  }];
  function StepItem({
    s,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: last ? 'none' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        flexShrink: 0,
        marginTop: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: s.done ? 'var(--m-primary)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--m-outline)'
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 14,
      color: "var(--m-on-primary)",
      sw: 3
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: s.done ? 'var(--m-on-surface-variant)' : 'var(--m-on-surface)'
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--m-on-surface-variant)',
        marginTop: 2
      }
    }, s.desc)), !s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 18,
      color: "var(--m-on-surface-variant)",
      style: {
        marginTop: 3
      }
    }) : null);
  }
  function StepsCard() {
    const doneN = STEPS.filter(s => s.done).length;
    const pct = Math.round(doneN / STEPS.length * 100);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        padding: '16px 18px',
        borderRadius: 24,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, "Erste Schritte"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, doneN, "/", STEPS.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        height: 6,
        borderRadius: 999,
        background: 'var(--m-outline-variant)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        borderRadius: 999,
        background: 'var(--m-primary)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        borderTop: i ? '1px solid var(--m-outline-variant)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(StepItem, {
      s: s
    })))));
  }

  /* ── Extended FAB — primary action: upload ─────────────────────────────── */
  function Fab() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 16,
        bottom: 88,
        zIndex: 30
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 56,
        padding: '0 20px',
        borderRadius: 18,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        fontSize: 15,
        fontWeight: 800,
        boxShadow: '0 6px 16px -4px var(--m-shadow), 0 2px 6px -2px var(--m-shadow)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "upload",
      size: 20,
      sw: 2.2
    }), "Hochladen"));
  }

  /* ── Material navigation bar ───────────────────────────────────────────── */
  const NAV = [{
    id: 'home',
    label: 'Home',
    icon: 'house'
  }, {
    id: 'videos',
    label: 'Videos',
    icon: 'video'
  }, {
    id: 'sessions',
    label: 'Sessions',
    icon: 'calendar-clock'
  }, {
    id: 'groups',
    label: 'Gruppen',
    icon: 'users'
  }, {
    id: 'profile',
    label: 'Profil',
    icon: 'user-round'
  }];
  function NavBar({
    active = 'home'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        display: 'flex',
        background: 'var(--m-nav)',
        paddingBottom: 12,
        paddingTop: 10
      }
    }, NAV.map(t => {
      const on = t.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 56,
          height: 30,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: on ? 'var(--m-secondary-container)' : 'transparent'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: t.icon,
        size: 22,
        sw: on ? 2.4 : 2,
        color: on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)'
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11.5,
          fontWeight: on ? 800 : 600,
          color: on ? 'var(--m-on-surface)' : 'var(--m-on-surface-variant)'
        }
      }, t.label));
    }));
  }

  /* ── Composed Material home ────────────────────────────────────────────── */
  function MaterialHome() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--m-bg)',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement(TopBar, {
      title: D.user.name.split(' ')[0],
      subtitle: "Guten Morgen"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        paddingBottom: 116
      },
      className: "m-scroll"
    }, /*#__PURE__*/React.createElement(HeroSession, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Deine Videos",
      action: "Alle ansehen"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, D.videos.slice(0, 2).map(v => /*#__PURE__*/React.createElement(VideoItem, {
      key: v.id,
      v: v
    })))), /*#__PURE__*/React.createElement(StepsCard, null)), /*#__PURE__*/React.createElement(Fab, null), /*#__PURE__*/React.createElement(NavBar, {
      active: "home"
    }));
  }

  /* ── Android device frame ──────────────────────────────────────────────── */
  function PhoneFrame({
    theme,
    screen
  }) {
    const t = window.MThemes[theme];
    const cssVars = {
      ...t.vars
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...cssVars,
        width: 360,
        height: 760,
        position: 'relative',
        flexShrink: 0,
        background: 'var(--m-bg)',
        borderRadius: 40,
        overflow: 'hidden',
        boxShadow: t.dark ? '0 0 0 2px #000, 0 0 0 11px #1c1c1f, 0 30px 60px -22px rgba(0,0,0,.7)' : '0 0 0 2px #2a2320, 0 0 0 11px #3a3330, 0 30px 60px -22px rgba(40,24,15,.45)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans), system-ui, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 11,
        height: 11,
        borderRadius: 999,
        background: '#000',
        zIndex: 60,
        opacity: .85
      }
    }), /*#__PURE__*/React.createElement(StatusBar, null), screen || /*#__PURE__*/React.createElement(MaterialHome, null));
  }
  window.StridoMaterial = {
    PhoneFrame,
    MaterialHome,
    Icon,
    StatusBar,
    TopBar,
    NavBar,
    Fab,
    SectionHeader,
    VideoItem
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_home_videos/design-references/material-home.jsx", error: String((e && e.message) || e) }); }

// design_handoff_home_videos/design-references/material-themes.js
try { (() => {
/* Strido — Material 3 / Material You token sets for the Android home redesign.
 * Four schemes: ember-orange (brand) and a neutral native-Material indigo,
 * each in light & dark. Each entry maps the --m-* role tokens consumed by
 * material-home.jsx. Plain script: assigns window.MThemes.
 */
window.MThemes = {
  /* ── Ember orange — derived Material tonal palette from Strido #ea580c ── */
  'orange-light': {
    label: 'Orange',
    sub: 'Light · brand ember',
    dark: false,
    vars: {
      '--m-bg': '#fff8f4',
      '--m-surface': '#fff8f4',
      '--m-s1': '#fdf1ea',
      '--m-s2': '#faece2',
      '--m-s3': '#f5e6db',
      '--m-s4': '#efe0d4',
      '--m-on-surface': '#221a15',
      '--m-on-surface-variant': '#54443b',
      '--m-outline': '#897668',
      '--m-outline-variant': '#d8c3b6',
      '--m-primary': '#bd4309',
      '--m-on-primary': '#ffffff',
      '--m-primary-container': '#ffdbc8',
      '--m-on-primary-container': '#3a1400',
      '--m-secondary-container': '#ffdcc4',
      '--m-on-secondary-container': '#5a3214',
      '--m-success': '#15803d',
      '--m-success-container': '#c7f1d2',
      '--m-on-success-container': '#05351a',
      '--m-nav': '#faece2',
      '--m-shadow': 'rgba(73,38,12,.20)'
    }
  },
  'orange-dark': {
    label: 'Orange',
    sub: 'Dark · brand ember',
    dark: true,
    vars: {
      '--m-bg': '#18120d',
      '--m-surface': '#18120d',
      '--m-s1': '#1f160f',
      '--m-s2': '#261c14',
      '--m-s3': '#31271d',
      '--m-s4': '#3c3026',
      '--m-on-surface': '#f2dfd2',
      '--m-on-surface-variant': '#d8c3b6',
      '--m-outline': '#a18d80',
      '--m-outline-variant': '#54443b',
      '--m-primary': '#ffb68f',
      '--m-on-primary': '#522300',
      '--m-primary-container': '#7c3500',
      '--m-on-primary-container': '#ffdbc8',
      '--m-secondary-container': '#5d4030',
      '--m-on-secondary-container': '#ffdcc4',
      '--m-success': '#7fd99a',
      '--m-success-container': '#1f4a30',
      '--m-on-success-container': '#c7f1d2',
      '--m-nav': '#211913',
      '--m-shadow': 'rgba(0,0,0,.45)'
    }
  },
  /* ── Neutral — native-Material indigo on cool greys ───────────────────── */
  'neutral-light': {
    label: 'Neutral',
    sub: 'Light · indigo accent',
    dark: false,
    vars: {
      '--m-bg': '#fbf8ff',
      '--m-surface': '#fbf8ff',
      '--m-s1': '#f3f2fb',
      '--m-s2': '#edecf5',
      '--m-s3': '#e7e6ef',
      '--m-s4': '#e1e0e9',
      '--m-on-surface': '#1b1b21',
      '--m-on-surface-variant': '#45464f',
      '--m-outline': '#76767f',
      '--m-outline-variant': '#c6c5d0',
      '--m-primary': '#4a5bd0',
      '--m-on-primary': '#ffffff',
      '--m-primary-container': '#dfe0ff',
      '--m-on-primary-container': '#001257',
      '--m-secondary-container': '#e1e0f9',
      '--m-on-secondary-container': '#191a2c',
      '--m-success': '#2e6c43',
      '--m-success-container': '#b2f1c2',
      '--m-on-success-container': '#00210f',
      '--m-nav': '#edecf5',
      '--m-shadow': 'rgba(20,22,40,.18)'
    }
  },
  'neutral-dark': {
    label: 'Neutral',
    sub: 'Dark · indigo accent',
    dark: true,
    vars: {
      '--m-bg': '#121318',
      '--m-surface': '#121318',
      '--m-s1': '#1b1b21',
      '--m-s2': '#1f2026',
      '--m-s3': '#2a2a31',
      '--m-s4': '#34343b',
      '--m-on-surface': '#e4e1e9',
      '--m-on-surface-variant': '#c6c5d0',
      '--m-outline': '#90909a',
      '--m-outline-variant': '#45464f',
      '--m-primary': '#bdc2ff',
      '--m-on-primary': '#1a2678',
      '--m-primary-container': '#323f8f',
      '--m-on-primary-container': '#dfe0ff',
      '--m-secondary-container': '#43444f',
      '--m-on-secondary-container': '#e1e0f9',
      '--m-success': '#94d5a4',
      '--m-success-container': '#14512a',
      '--m-on-success-container': '#b2f1c2',
      '--m-nav': '#1f2026',
      '--m-shadow': 'rgba(0,0,0,.5)'
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_home_videos/design-references/material-themes.js", error: String((e && e.message) || e) }); }

// design_handoff_home_videos/design-references/videos-home.jsx
try { (() => {
/* Strido — Material 3 "Videos" screen (orange light + dark).
 * Reuses shared primitives from window.StridoMaterial. Exposes window.StridoVideos.
 */
(function () {
  const D = window.StridoData;
  const M = window.StridoMaterial;
  const {
    Icon,
    TopBar,
    NavBar,
    Fab
  } = M;

  /* status → Material chip tones (reads --m-* tokens) */
  function statusChip(status) {
    if (status === 'completed') return {
      bg: 'var(--m-success-container)',
      fg: 'var(--m-on-success-container)',
      label: 'Geprüft',
      icon: 'check-circle-2'
    };
    if (status === 'pending') return {
      bg: 'var(--m-secondary-container)',
      fg: 'var(--m-on-secondary-container)',
      label: 'In Prüfung',
      icon: 'loader'
    };
    return {
      bg: 'var(--m-s3)',
      fg: 'var(--m-on-surface-variant)',
      label: 'Lädt hoch',
      icon: 'upload-cloud'
    };
  }

  /* ── Filter — Material 3 segmented button (full width) ──────────────────── */
  function SegmentedFilter({
    active
  }) {
    const reviewed = D.videos.filter(v => v.status === 'completed').length;
    const segs = [{
      id: 'all',
      label: 'Alle'
    }, {
      id: 'toReview',
      label: 'Zu prüfen'
    }, {
      id: 'reviewed',
      label: 'Geprüft'
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        display: 'flex',
        height: 42,
        borderRadius: 999,
        border: '1.4px solid var(--m-outline)',
        overflow: 'hidden'
      }
    }, segs.map((s, i) => {
      const on = s.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          background: on ? 'var(--m-secondary-container)' : 'transparent',
          color: on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)',
          borderLeft: i ? '1.4px solid var(--m-outline)' : 'none',
          fontSize: 13.5,
          fontWeight: 700
        }
      }, on ? /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 15,
        sw: 2.8,
        color: "var(--m-on-secondary-container)"
      }) : null, /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap'
        }
      }, s.label));
    }));
  }

  /* ── Video card (richer than the home tile) ────────────────────────────── */
  function VideoCard({
    v
  }) {
    const s = statusChip(v.status);
    const uploading = v.status === 'waiting_upload';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 12,
        borderRadius: 22,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 104,
        height: 70,
        borderRadius: 16,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, uploading ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 22,
      color: "rgba(255,255,255,.9)",
      sw: 2.2
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 999,
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 17,
      color: "#fff",
      sw: 2.4,
      style: {
        marginLeft: 2
      }
    })), !uploading ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.6)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--m-on-surface)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: 'var(--m-on-surface-variant)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 9px 3px 7px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: s.bg,
        color: s.fg
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: s.icon,
      size: 13,
      color: s.fg,
      sw: 2.4
    }), s.label), v.reviews ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: "var(--m-on-surface-variant)"
    }), v.reviews) : null)));
  }

  /* ── Composed Videos screen ────────────────────────────────────────────── */
  function MaterialVideos() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--m-bg)',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement(TopBar, {
      title: "Videos",
      avatar: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingBottom: 116
      },
      className: "m-scroll"
    }, /*#__PURE__*/React.createElement(SegmentedFilter, {
      active: "all"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px 2px',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)',
        letterSpacing: '.04em',
        textTransform: 'uppercase'
      }
    }, D.videos.length, " Videos"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, D.videos.map(v => /*#__PURE__*/React.createElement(VideoCard, {
      key: v.id,
      v: v
    })))), /*#__PURE__*/React.createElement(Fab, null), /*#__PURE__*/React.createElement(NavBar, {
      active: "videos"
    }));
  }
  window.StridoVideos = {
    MaterialVideos,
    VideoCard
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_home_videos/design-references/videos-home.jsx", error: String((e && e.message) || e) }); }

// handoff_ui_kit/design-references/data.js
try { (() => {
// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: {
    name: 'Mia Halvorsen',
    initials: 'MH',
    role: 'Rider',
    roleType: 'student',
    email: 'mia.halvorsen@example.com',
    language: 'de',
    timezone: 'Europe/Berlin'
  },
  groups: [{
    id: 'g1',
    name: 'Nord Eventing Academy',
    initials: 'NE',
    members: 14
  }, {
    id: 'g2',
    name: 'Trail & Dressage Club',
    initials: 'TD',
    members: 9
  }],
  videos: [{
    id: 'v1',
    title: 'Combination line — take 2',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 3,
    duration: '0:48',
    desc: 'Two strides in, felt rushed to the oxer. Coach asked me to upload the warm-up and the second attempt too so we can compare the canter rhythm across all three before the lesson on Friday.',
    parts: [{
      id: 'p1',
      label: 'Aufwärmen',
      duration: '1:12',
      status: 'ready'
    }, {
      id: 'p2',
      label: 'Versuch 1',
      duration: '0:48',
      status: 'ready'
    }, {
      id: 'p3',
      label: 'Versuch 2',
      duration: '0:51',
      status: 'processing'
    }]
  }, {
    id: 'v2',
    title: 'Sitting trot — long side',
    group: 'Trail & Dressage Club',
    gi: 'TD',
    status: 'completed',
    reviews: 6,
    duration: '1:22',
    desc: 'Working on a steadier contact.'
  }, {
    id: 'v3',
    title: 'Warm-up canter transitions',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 1,
    duration: '2:05',
    desc: 'Left lead pickup is sticky.',
    parts: [{
      id: 'q1',
      label: 'Schritt',
      duration: '0:54',
      status: 'ready'
    }, {
      id: 'q2',
      label: 'Trab links',
      duration: '1:08',
      status: 'ready'
    }, {
      id: 'q3',
      label: 'Trab rechts',
      duration: '1:02',
      status: 'ready'
    }, {
      id: 'q4',
      label: 'Galopp links',
      duration: '0:47',
      status: 'ready'
    }, {
      id: 'q5',
      label: 'Galopp rechts',
      duration: '0:51',
      status: 'ready'
    }, {
      id: 'q6',
      label: 'Übergänge',
      duration: '1:15',
      status: 'ready'
    }, {
      id: 'q7',
      label: 'Cool-down',
      duration: '0:39',
      status: 'ready'
    }, {
      id: 'q8',
      label: 'Nachbereitung',
      duration: '0:28',
      status: 'processing'
    }]
  }, {
    id: 'v4',
    title: 'Grid work — bounce to one',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'waiting_upload',
    reviews: 0,
    duration: '0:36',
    desc: ''
  }],
  reviews: [{
    id: 'r1',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:12',
    when: '2h ago',
    body: 'Good rhythm on the approach — eyes up a stride earlier and the distance comes to you.'
  }, {
    id: 'r2',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:31',
    when: '2h ago',
    body: 'Here you tipped forward over the first element. Keep your shoulders back and let the horse close the gap.',
    replies: [{
      id: 'r2a',
      author: 'Mia Halvorsen',
      initials: 'MH',
      when: '1h ago',
      body: 'Makes sense — I felt the lean. Will drill it tomorrow.'
    }]
  }],
  bookings: [{
    id: 'b1',
    type: 'Video review session',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Tue 18 Jun · 16:00',
    mins: 30,
    status: 'pending',
    joinable: true
  }, {
    id: 'b2',
    type: 'Flatwork deep-dive',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Fri 21 Jun · 09:30',
    mins: 45,
    status: 'pending',
    joinable: false
  }, {
    id: 'b3',
    type: 'Jumping technique',
    who: 'Coach Lars',
    role: 'expert',
    when: 'Mon 10 Jun · 17:00',
    mins: 30,
    status: 'done',
    joinable: false,
    recording: 'ready'
  }, {
    id: 'b4',
    type: 'Course walk-through',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Thu 6 Jun · 14:00',
    mins: 30,
    status: 'cancelled',
    joinable: false,
    reason: 'Horse off work.'
  }],
  notifications: 2,
  notificationList: [{
    id: 'n1',
    kind: 'review',
    unread: true,
    day: 'today',
    when: 'vor 2 Std',
    title: 'Neues Feedback von Coach Petra',
    body: '„Kombination — Versuch 2“ wurde kommentiert.'
  }, {
    id: 'n2',
    kind: 'invite',
    unread: true,
    day: 'today',
    when: 'vor 5 Std',
    title: 'Einladung in eine Gruppe',
    body: 'Coach Petra hat dich in „Nord Eventing Academy“ eingeladen.',
    code: 'NEA-2K9'
  }, {
    id: 'n3',
    kind: 'booking',
    unread: false,
    day: 'earlier',
    when: 'Gestern',
    title: 'Session bestätigt',
    body: 'Video-Review mit Coach Petra · Di 18 Jun, 16:00.'
  }, {
    id: 'n4',
    kind: 'upload',
    unread: false,
    day: 'earlier',
    when: 'Gestern',
    title: 'Upload abgeschlossen',
    body: '„Aussitzen im Trab — lange Seite“ ist bereit.'
  }, {
    id: 'n5',
    kind: 'system',
    unread: false,
    day: 'earlier',
    when: 'Mo',
    title: 'Willkommen bei Strido',
    body: 'Lade dein erstes Video hoch, um Feedback zu erhalten.'
  }],
  // Group membership detail (keyed by group id) for the group-detail view.
  groupMembers: {
    g1: {
      desc: 'Eventing-Gruppe für Vielseitigkeitsreiter — wöchentliches Video-Feedback und Live-Coaching.',
      experts: [{
        id: 'e1',
        name: 'Petra Nilsson',
        initials: 'PN',
        role: 'Cheftrainerin'
      }],
      students: [{
        id: 's1',
        name: 'Mia Halvorsen',
        initials: 'MH',
        role: 'Reiterin'
      }, {
        id: 's2',
        name: 'Jonas Berg',
        initials: 'JB',
        role: 'Reiter'
      }, {
        id: 's3',
        name: 'Lena Sund',
        initials: 'LS',
        role: 'Reiterin'
      }]
    },
    g2: {
      desc: 'Dressur- und Geländegruppe für entspanntes, technisches Training.',
      experts: [{
        id: 'e2',
        name: 'Lars Moen',
        initials: 'LM',
        role: 'Trainer'
      }],
      students: [{
        id: 's1',
        name: 'Mia Halvorsen',
        initials: 'MH',
        role: 'Reiterin'
      }, {
        id: 's4',
        name: 'Erik Dahl',
        initials: 'ED',
        role: 'Reiter'
      }]
    }
  },
  // Reports / activity summary (expert role view).
  reports: {
    period: 'März 2026',
    videoCount: 18,
    videoDur: '4 Std 12 Min',
    liveCount: 6,
    liveDur: '3 Std 30 Min',
    peopleCount: 9,
    groupCount: 2,
    events: [{
      id: 'a1',
      kind: 'video',
      title: 'Kombination — Versuch 2',
      who: 'Mia Halvorsen',
      group: 'Nord Eventing Academy',
      date: '18 Mär',
      dur: '0:48 Min'
    }, {
      id: 'a2',
      kind: 'live',
      title: 'Live-Coaching',
      who: 'Jonas Berg',
      group: 'Nord Eventing Academy',
      date: '16 Mär',
      dur: '45 Min'
    }, {
      id: 'a3',
      kind: 'video',
      title: 'Aussitzen im Trab',
      who: 'Lena Sund',
      group: 'Trail & Dressage Club',
      date: '14 Mär',
      dur: '1:22 Min'
    }, {
      id: 'a4',
      kind: 'video',
      title: 'Galopp-Übergänge',
      who: 'Erik Dahl',
      group: 'Nord Eventing Academy',
      date: '11 Mär',
      dur: '2:05 Min'
    }, {
      id: 'a5',
      kind: 'live',
      title: 'Live-Coaching',
      who: 'Mia Halvorsen',
      group: 'Trail & Dressage Club',
      date: '8 Mär',
      dur: '30 Min'
    }]
  },
  // Expert availability management.
  availability: {
    sessionTypes: [{
      id: 'st1',
      name: 'Video-Review',
      mins: 30,
      desc: 'Detailliertes Feedback zu einem hochgeladenen Video.'
    }, {
      id: 'st2',
      name: 'Live-Coaching',
      mins: 45,
      desc: 'Eins-zu-eins-Session in Echtzeit per Video.'
    }],
    schedule: [{
      id: 'av1',
      day: 'Montag',
      from: '16:00',
      to: '19:00'
    }, {
      id: 'av2',
      day: 'Mittwoch',
      from: '09:00',
      to: '12:00'
    }, {
      id: 'av3',
      day: 'Freitag',
      from: '14:00',
      to: '18:00'
    }],
    blocked: [{
      id: 'bl1',
      date: 'Fr 27 Jun',
      range: 'Ganzer Tag',
      reason: 'Turnier'
    }, {
      id: 'bl2',
      date: 'Mi 2 Jul',
      range: '14:00 – 17:00',
      reason: ''
    }]
  },
  // Coaching booking flow data.
  coaching: {
    // Session types lead the flow ("Was?"): each carries duration + price so the
    // running summary bar can show cost from the first choice onward.
    sessionTypes: [{
      id: 'st1',
      name: 'Video-Review',
      mins: 30,
      price: 39,
      icon: 'play-circle',
      desc: 'Detailliertes Feedback zu einem hochgeladenen Video.'
    }, {
      id: 'st2',
      name: 'Live-Coaching',
      mins: 45,
      price: 69,
      icon: 'video',
      desc: 'Eins-zu-eins-Session in Echtzeit per Video.'
    }, {
      id: 'st3',
      name: 'Trainingsplan',
      mins: 20,
      price: 29,
      icon: 'clipboard-list',
      desc: 'Wochenplanung mit Zielen und passenden Übungen.'
    }],
    experts: [{
      id: 'e1',
      name: 'Petra Nilsson',
      initials: 'PN',
      role: 'Cheftrainerin',
      specialty: 'Vielseitigkeit & Springen',
      rating: 4.9,
      reviews: 128
    }, {
      id: 'e2',
      name: 'Lars Moen',
      initials: 'LM',
      role: 'Dressurtrainer',
      specialty: 'Dressur & Grundausbildung',
      rating: 4.8,
      reviews: 94
    }, {
      id: 'e3',
      name: 'Jonas Berg',
      initials: 'JB',
      role: 'Geländetrainer',
      specialty: 'Cross & Kondition',
      rating: 4.7,
      reviews: 61
    }],
    // Date rail ("Wann?"). isToday drives the "Heute"-label.
    days: [{
      id: 'd0',
      dow: 'Di',
      date: '18',
      month: 'Jun',
      isToday: true
    }, {
      id: 'd1',
      dow: 'Mi',
      date: '19',
      month: 'Jun'
    }, {
      id: 'd2',
      dow: 'Do',
      date: '20',
      month: 'Jun'
    }, {
      id: 'd3',
      dow: 'Fr',
      date: '21',
      month: 'Jun'
    }, {
      id: 'd4',
      dow: 'Sa',
      date: '22',
      month: 'Jun'
    }, {
      id: 'd5',
      dow: 'So',
      date: '23',
      month: 'Jun'
    }],
    // Availability is per expert and per day — start times only (the session
    // duration fills in the end). Missing day = no free slots that day.
    availability: {
      e1: {
        d0: ['16:00', '16:45', '17:30'],
        d1: ['09:00', '10:15'],
        d3: ['14:00', '15:00', '16:30']
      },
      e2: {
        d1: ['08:30', '09:15', '11:00'],
        d2: ['13:00', '14:30'],
        d4: ['10:00', '11:30']
      },
      e3: {
        d0: ['18:00'],
        d2: ['16:00', '17:00'],
        d3: ['09:30', '10:30', '12:00'],
        d5: ['11:00', '14:00']
      }
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff_ui_kit/design-references/data.js", error: String((e && e.message) || e) }); }

// handoff_ui_kit/design-references/screens.jsx
try { (() => {
/* Strido mobile UI kit — screens (Material You).
 * Composes the design-system primitives from window.StridoDesignSystem_dc14ef.
 * Exposes window.StridoScreens, consumed by index.html.
 * German copy, matching the approved Home/Videos redesign.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;

  /* Platform switch (driven by the Tweaks panel via setPlatform). The wrapped DS
     components auto-inject the current platform, so every screen renders the
     Material or the iOS variant from one source. Components with no native iOS
     divergence (Fab, Badge, Avatar, EmptyState, IconTile) are used unwrapped. */
  let PLATFORM = 'material';
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  function setPlatform(p) {
    PLATFORM = p === 'ios' ? 'ios' : 'material';
    PlatformState.current = PLATFORM;
  }
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button);
  const IconButton = _w(DS.IconButton);
  const Card = _w(DS.Card);
  const Chip = _w(DS.Chip);
  const SegmentedButton = _w(DS.SegmentedButton);
  const Stepper = _w(DS.Stepper);
  const ProgressBar = _w(DS.ProgressBar);
  const Textarea = _w(DS.Textarea);
  const ListItem = _w(DS.ListItem);
  const Switch = _w(DS.Switch);
  const Divider = _w(DS.Divider);
  const {
    Fab,
    Badge,
    Avatar,
    EmptyState,
    IconTile,
    LargeTitleBar
  } = DS;
  const D = window.StridoData;

  /* Lucide icon helper — renders an <i> Lucide replaces with an SVG after mount. */
  function Icon({
    n,
    size = 20,
    color = 'currentColor',
    sw = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color,
        strokeWidth: sw,
        display: 'inline-flex',
        flexShrink: 0,
        ...style
      }
    });
  }
  const T = {
    strong: 'var(--role-on-surface)',
    muted: 'var(--role-on-surface-variant)',
    primary: 'var(--role-accent)',
    primaryStrong: 'var(--role-accent-strong)',
    bg: 'var(--role-background)'
  };

  /* Tiny nav bus so leaf components (e.g. the header bell) can push screens
     without threading the go() callback through every screen. App registers go(). */
  let _nav = null;
  function setNav(fn) {
    _nav = fn;
  }
  function navTo(action) {
    if (_nav) _nav(action);
  }

  /* German labels for the English sample data ------------------------------- */
  const TYPE_DE = {
    'Video review session': 'Video-Review',
    'Flatwork deep-dive': 'Dressur-Deep-Dive',
    'Jumping technique': 'Spring-Technik',
    'Course walk-through': 'Parcours-Begehung'
  };
  const VIDEO_DE = {
    'Combination line — take 2': 'Kombination — Versuch 2',
    'Sitting trot — long side': 'Aussitzen im Trab — lange Seite',
    'Warm-up canter transitions': 'Galopp-Übergänge im Warm-up',
    'Grid work — bounce to one': 'Gymnastikreihe — Bounce'
  };
  const dt = s => TYPE_DE[s] || s;
  const dv = s => VIDEO_DE[s] || s;
  function videoStatus(status) {
    if (status === 'completed') return {
      tone: 'success',
      label: 'Geprüft',
      icon: 'check-circle-2'
    };
    if (status === 'pending') return {
      tone: 'primary',
      label: 'In Prüfung',
      icon: 'clock'
    };
    return {
      tone: 'neutral',
      label: 'Lädt hoch',
      icon: 'upload-cloud'
    };
  }

  /* ── Shared screen shell: fixed header + scroll area ────────────────────── */
  function Screen({
    header,
    children,
    pad = 16,
    gap = 22,
    bottom = 116
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `0 0 ${bottom}px`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px 0`
      }
    }, children)));
  }

  /* Plain title top app bar (Videos / Sessions / Groups / Profile). */
  /* Plain title top app bar (Material) / large-title nav bar (iOS). `action` is
     the screen's primary action — on iOS it surfaces as a nav-bar button (iOS has
     no FAB); on Material it's null (the FAB in index.html handles it). */
  function bellNode() {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 23,
      color: "var(--role-accent)"
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -1,
        right: -1,
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--role-danger)',
        border: '1.5px solid var(--role-background)'
      }
    }) : null);
  }
  function TopBar({
    title,
    action
  }) {
    if (isIOS()) {
      const actions = [];
      if (action) actions.push({
        id: 'primary',
        label: action.label,
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: action.icon,
          size: 26,
          color: "var(--role-accent)"
        }),
        onPress: action.onPress
      });
      actions.push({
        id: 'bell',
        label: 'Benachrichtigungen',
        icon: bellNode(),
        onPress: () => navTo({
          push: {
            screen: 'notifications'
          }
        })
      });
      return /*#__PURE__*/React.createElement(LargeTitleBar, {
        platform: "ios",
        title: title,
        actions: actions
      });
    }
    if (DS.TopAppBar) {
      return /*#__PURE__*/React.createElement(DS.TopAppBar, {
        platform: "material",
        title: title,
        trailing: /*#__PURE__*/React.createElement(Bell, null),
        style: {
          background: T.bg
        }
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: T.strong,
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement(Bell, null));
  }
  function Bell() {
    return /*#__PURE__*/React.createElement("button", {
      "aria-label": "Benachrichtigungen",
      onClick: () => navTo({
        push: {
          screen: 'notifications'
        }
      }),
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 22,
      color: T.strong
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        boxSizing: 'border-box',
        background: 'var(--role-accent)',
        color: 'var(--role-on-accent)',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        border: '2px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, D.notifications) : null);
  }
  function SectionHeader({
    title,
    action,
    onAction
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), action ? /*#__PURE__*/React.createElement("button", {
      onClick: onAction,
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, action) : null);
  }

  /* ── Reusable nav header for pushed screens ─────────────────────────────── */
  function NavHeader({
    title,
    onBack,
    right
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minHeight: 44,
          padding: '6px 10px',
          background: T.bg
        }
      }, onBack ? /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        "aria-label": "Zur\xFCck",
        style: {
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          color: 'var(--role-accent)',
          zIndex: 1
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-left",
        size: 27,
        color: "var(--role-accent)",
        sw: 2.4
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 17,
          letterSpacing: '-0.01em'
        }
      }, "Zur\xFCck")) : /*#__PURE__*/React.createElement("div", {
        style: {
          width: 8
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none'
        }
      }, title), /*#__PURE__*/React.createElement("div", {
        style: {
          marginLeft: 'auto',
          zIndex: 1
        }
      }, right));
    }
    if (DS.TopAppBar) {
      return /*#__PURE__*/React.createElement(DS.TopAppBar, {
        platform: "material",
        title: title,
        style: {
          background: T.bg
        },
        leading: onBack ? /*#__PURE__*/React.createElement(IconButton, {
          variant: "ghost",
          label: "Zur\xFCck",
          onClick: onBack
        }, /*#__PURE__*/React.createElement(Icon, {
          n: "arrow-left",
          size: 24,
          color: T.strong
        })) : null,
        trailing: right
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 8px 8px 4px',
        background: T.bg
      }
    }, onBack ? /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Zur\xFCck",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "arrow-left",
      size: 24,
      color: T.strong
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), right);
  }

  /* ── Video tile (Material filled) ───────────────────────────────────────── */
  function VideoTile({
    v,
    onClick
  }) {
    const s = videoStatus(v.status);
    const uploading = v.status === 'waiting_upload';
    const ios = isIOS();
    const tileStyle = ios ? {
      borderRadius: 14,
      background: 'var(--role-surface)',
      boxShadow: '0 1px 3px rgba(38,24,15,0.05), 0 8px 22px -10px rgba(38,24,15,0.13), 0 0 0 0.5px rgba(38,24,15,0.05)'
    } : {
      borderRadius: 'var(--radius-tile)',
      background: 'var(--role-surface-1)'
    };
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 11,
        ...tileStyle
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 100,
        height: 66,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, uploading ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 999,
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 16,
      color: "#fff",
      sw: 2.4,
      style: {
        marginLeft: 2
      }
    })), !uploading ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.6)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, dv(v.title)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), v.reviews ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: T.muted
    }), v.reviews) : null)));
  }

  /* ── Login ──────────────────────────────────────────────────────────────── */
  function Login({
    onSignIn
  }) {
    const [busy, setBusy] = React.useState(false);
    function go() {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        onSignIn();
      }, 700);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: T.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 4,
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'var(--role-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 32,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, "S")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em'
      }
    }, "Strido"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: T.muted
      }
    }, "Video-Coaching f\xFCr Reiter")), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: 20,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Willkommen zur\xFCck"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '8px 0 0',
        fontSize: 14,
        lineHeight: 1.6,
        color: T.muted
      }
    }, "Lade Reitvideos hoch und erhalte sekundengenaues Feedback \u2014 oder geh live, eins zu eins."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Anmelden",
      loading: busy,
      onClick: go,
      style: {
        width: '100%'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Konto erstellen",
      variant: "tonal",
      onClick: go,
      style: {
        width: '100%'
      }
    })))));
  }

  /* ── Home ───────────────────────────────────────────────────────────────── */
  function HeroSession({
    go
  }) {
    const b = D.bookings.find(x => x.status === 'pending') || D.bookings[0];
    return /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      padding: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        opacity: .9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "calendar-clock",
      size: 14,
      sw: 2.4
    }), "N\xE4chste Session"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: 'var(--role-surface)',
        color: T.strong
      }
    }, "in 2 Tagen")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1.25
      }
    }, dt(b.type), " mit ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13.5,
        fontWeight: 600,
        opacity: .92
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 15,
      sw: 2.2
    }), b.when, " \xB7 ", b.mins, " Min"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 18,
        color: "currentColor"
      }),
      onClick: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      }),
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Details",
      variant: "secondary",
      onClick: () => go({
        tab: 'sessions'
      }),
      style: {
        background: 'transparent',
        borderColor: 'currentColor',
        color: 'inherit'
      }
    })));
  }
  const STEPS = [{
    done: true,
    label: 'Gruppe beigetreten',
    desc: 'Du kannst in deiner Gruppe Videos hochladen und Coaching buchen.'
  }, {
    done: false,
    label: 'Erstes Video hochladen',
    desc: 'Teile ein Trainingsvideo, damit ein Experte es prüfen kann.'
  }, {
    done: false,
    label: 'Live-Coaching buchen',
    desc: 'Reserviere einen Termin, wenn dein Experte verfügbar ist.'
  }];
  function StepRow({
    s
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        flexShrink: 0,
        marginTop: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: s.done ? 'var(--role-accent)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--role-outline)'
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 14,
      color: "var(--role-on-accent)",
      sw: 3
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: s.done ? T.muted : T.strong
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        color: T.muted,
        marginTop: 2
      }
    }, s.desc)), !s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 18,
      color: T.muted,
      style: {
        marginTop: 3
      }
    }) : null);
  }
  function StepsCard() {
    const done = STEPS.filter(s => s.done).length;
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '16px 18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, "Erste Schritte"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.muted
      }
    }, done, "/", STEPS.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: done,
      max: STEPS.length
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        borderTop: i ? '1px solid var(--role-outline)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(StepRow, {
      s: s
    })))));
  }
  function Home({
    go
  }) {
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Strido"
      })
    }, /*#__PURE__*/React.createElement(HeroSession, {
      go: go
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Deine Videos",
      action: "Alle ansehen",
      onAction: () => go({
        tab: 'videos'
      })
    }), D.videos.slice(0, 2).map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))), /*#__PURE__*/React.createElement(StepsCard, null));
  }

  /* ── Videos ─────────────────────────────────────────────────────────────── */
  function Videos({
    go,
    primaryAction
  }) {
    const [filter, setFilter] = React.useState('all');
    const reviewed = D.videos.filter(v => v.status === 'completed').length;
    const list = filter === 'all' ? D.videos : filter === 'reviewed' ? D.videos.filter(v => v.status === 'completed') : D.videos.filter(v => v.status !== 'completed');
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Videos",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: filter,
      onChange: setFilter,
      segments: [{
        id: 'all',
        label: 'Alle'
      }, {
        id: 'toReview',
        label: 'Zu prüfen'
      }, {
        id: 'reviewed',
        label: 'Geprüft'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        padding: '0 4px'
      }
    }, list.length, " Videos"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, list.map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))));
  }

  /* ── Asset detail ───────────────────────────────────────────────────────── */
  function ReviewBlock({
    r,
    isReply
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: r.initials,
      alt: r.author,
      size: isReply ? 28 : 36,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.strong
      }
    }, r.author), r.ts ? /*#__PURE__*/React.createElement("button", {
      "aria-label": `Zu ${r.ts} springen`,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 9px 0 7px',
        borderRadius: 12,
        background: 'var(--role-accent-container)',
        color: 'var(--role-on-accent-container)',
        fontSize: 12.5,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 11,
      color: "var(--role-on-accent-container)",
      sw: 2.6,
      style: {
        marginLeft: 0
      }
    }), r.ts) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        fontSize: 14,
        lineHeight: 1.55,
        color: T.strong
      }
    }, r.body), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, r.when), !isReply ? /*#__PURE__*/React.createElement("button", {
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "reply",
      size: 14,
      color: T.muted
    }), " Antworten") : null)));
  }
  function AssetDetail({
    id,
    onBack
  }) {
    const v = D.videos.find(x => x.id === id) || D.videos[0];
    const [draft, setDraft] = React.useState('');
    const [atTime, setAtTime] = React.useState(false);
    const parts = v.parts || [];
    const hasParts = parts.length > 1;
    const manyParts = parts.length > 5;
    const firstReady = Math.max(0, parts.findIndex(p => p.status !== 'processing'));
    const [activePart, setActivePart] = React.useState(hasParts ? firstReady : 0);
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [descOpen, setDescOpen] = React.useState(false);
    const descLong = (v.desc || '').length > 90;
    const cur = hasParts ? parts[activePart] : null;
    const s = videoStatus(v.status);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: dv(v.title),
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: 'linear-gradient(135deg,#3a2417,#1a0f08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 26,
      color: "#fff",
      sw: 2.2,
      style: {
        marginLeft: 3
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#fff'
      }
    }, "0:12"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: 0.28,
      height: 4
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'rgba(255,255,255,.7)'
      }
    }, cur ? cur.duration : v.duration))), hasParts && !manyParts ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 'none',
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, "Teile"), parts.map((p, i) => {
      const active = i === activePart;
      const proc = p.status === 'processing';
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: () => {
          if (!proc) setActivePart(i);
        },
        "aria-label": `Teil ${i + 1}${proc ? ', wird verarbeitet' : ', ' + p.duration}`,
        style: {
          all: 'unset',
          flex: 'none',
          cursor: proc ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 30,
          padding: '0 12px',
          borderRadius: 15,
          fontSize: 12.5,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: active ? 700 : 600,
          color: proc ? T.muted : active ? 'var(--role-on-secondary-container)' : T.strong,
          background: active ? 'var(--role-secondary-container)' : 'transparent',
          border: active ? '1px solid transparent' : '1px solid var(--role-outline)',
          opacity: proc ? 0.7 : 1
        }
      }, proc ? /*#__PURE__*/React.createElement(Icon, {
        n: "loader",
        size: 12,
        color: T.muted
      }) : null, "Teil ", i + 1, proc ? null : /*#__PURE__*/React.createElement("span", {
        style: {
          opacity: 0.7
        }
      }, " \xB7 ", p.duration));
    })) : null, hasParts && manyParts ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 0'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, "Teile"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSheetOpen(true),
      "aria-label": `Teil ${activePart + 1} von ${parts.length} — alle Teile anzeigen`,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 6px 0 12px',
        borderRadius: 16,
        border: '1px solid var(--role-outline)',
        color: T.strong,
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "Teil ", activePart + 1), " von ", parts.length, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-down",
      size: 16,
      color: T.muted
    }))) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: v.gi,
      alt: v.group,
      size: 24,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 700,
        color: T.strong,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, v.group), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    })), v.desc ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: descOpen || !descLong ? {
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.5
      } : {
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, v.desc), descLong ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setDescOpen(o => !o),
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, descOpen ? 'Weniger anzeigen' : 'Mehr anzeigen') : null) : null), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 18,
      color: T.primaryStrong
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong
      }
    }, "Kommentare"), /*#__PURE__*/React.createElement(Badge, {
      label: D.reviews.length
    })), D.reviews.map(r => /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: r
    }), (r.replies || []).map(rr => /*#__PURE__*/React.createElement("div", {
      key: rr.id,
      style: {
        paddingLeft: 22
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: rr,
      isReply: true
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: draft,
      onChange: setDraft,
      rows: 2,
      placeholder: "Kommentar hinzuf\xFCgen\u2026"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Chip, {
      label: "Bei 0:12",
      selected: atTime,
      showCheck: false,
      onClick: () => setAtTime(a => !a)
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verbessern",
      variant: "ghost",
      size: "sm",
      disabled: !draft.trim()
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "sparkles",
      size: 18,
      color: T.muted
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Senden",
      variant: "primary",
      size: "sm",
      disabled: !draft.trim()
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "send",
      size: 18,
      color: "currentColor"
    }))))))), sheetOpen ? /*#__PURE__*/React.createElement("div", {
      onClick: () => setSheetOpen(false),
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,.4)',
        display: 'flex',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxHeight: '72%',
        background: 'var(--role-surface-1)',
        borderRadius: '28px 28px 0 0',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 8,
        boxShadow: '0 -8px 30px rgba(0,0,0,.18)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0 4px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--role-outline)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px 10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong
      }
    }, "Teile"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.muted
      }
    }, parts.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }
    }, parts.map((p, i) => {
      const active = i === activePart;
      const proc = p.status === 'processing';
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: () => {
          if (!proc) {
            setActivePart(i);
            setSheetOpen(false);
          }
        },
        style: {
          all: 'unset',
          cursor: proc ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: active ? 'var(--role-secondary-container)' : 'transparent',
          opacity: proc ? 0.6 : 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 22,
          display: 'inline-flex',
          justifyContent: 'center'
        }
      }, active ? /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 18,
        color: "var(--role-on-secondary-container)",
        sw: 2.6
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: T.muted,
          fontVariantNumeric: 'tabular-nums'
        }
      }, i + 1)), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 15,
          fontWeight: active ? 700 : 600,
          color: active ? 'var(--role-on-secondary-container)' : T.strong
        }
      }, "Teil ", i + 1), proc ? /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12.5,
          fontWeight: 700,
          color: T.muted
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "loader",
        size: 13,
        color: T.muted
      }), "Wird verarbeitet") : /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: active ? 'var(--role-on-secondary-container)' : T.muted,
          fontVariantNumeric: 'tabular-nums'
        }
      }, p.duration));
    })))) : null);
  }

  /* ── Sessions ───────────────────────────────────────────────────────────── */
  function bookingStatus(status) {
    if (status === 'cancelled') return {
      tone: 'danger',
      label: 'Storniert'
    };
    if (status === 'done') return {
      tone: 'neutral',
      label: 'Erledigt'
    };
    return {
      tone: 'primary',
      label: 'Anstehend'
    };
  }
  function BookingCard({
    b,
    onJoin
  }) {
    const s = bookingStatus(b.status);
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, dt(b.type)), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), b.recording === 'ready' ? /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      label: "Aufnahme bereit"
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.muted
      }
    }, "Experte: ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13.5,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 14,
      color: T.muted
    }), b.when, " \xB7 ", b.mins, " Min"), b.reason ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--role-danger)'
      }
    }, "Grund: ", b.reason) : null, b.joinable || b.recording === 'ready' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        gap: 8
      }
    }, b.joinable ? /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 16,
        color: "currentColor"
      }),
      onClick: onJoin
    }) : null, b.recording === 'ready' ? /*#__PURE__*/React.createElement(Button, {
      label: "Aufnahme ansehen",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "play",
        size: 16,
        color: "var(--role-on-secondary-container)"
      })
    }) : null) : null);
  }
  function Sessions({
    go,
    primaryAction
  }) {
    const [tab, setTab] = React.useState('upcoming');
    const upcoming = D.bookings.filter(b => b.status === 'pending');
    const past = D.bookings.filter(b => b.status === 'done');
    const cancelled = D.bookings.filter(b => b.status === 'cancelled');
    const list = tab === 'past' ? past : tab === 'cancelled' ? cancelled : upcoming;
    const empty = {
      upcoming: 'anstehenden',
      past: 'vergangenen',
      cancelled: 'stornierten'
    }[tab];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Sessions",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: tab,
      onChange: setTab,
      segments: [{
        id: 'upcoming',
        label: 'Anstehend'
      }, {
        id: 'past',
        label: 'Vergangen'
      }, {
        id: 'cancelled',
        label: 'Storniert'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, list.length ? list.map(b => /*#__PURE__*/React.createElement(BookingCard, {
      key: b.id,
      b: b,
      onJoin: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      })
    })) : /*#__PURE__*/React.createElement(EmptyState, {
      title: `Keine ${empty} Sessions`,
      description: "Deine Sessions erscheinen hier.",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "calendar-clock",
        size: 24,
        color: T.primary
      })
    })));
  }

  /* ── Call ───────────────────────────────────────────────────────────────── */
  function Call({
    id,
    onLeave
  }) {
    const b = D.bookings.find(x => x.id === id) || D.bookings[0];
    const [mic, setMic] = React.useState(true);
    const [cam, setCam] = React.useState(true);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        background: '#0c0704',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: 'radial-gradient(120% 80% at 50% 35%, #3a2417, #0c0704)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: "CP",
      alt: b.who,
      size: 84,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: 700,
        color: '#fff'
      }
    }, b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        fontSize: 13,
        color: 'rgba(255,255,255,.6)'
      }
    }, "Warte auf den anderen Teilnehmer\u2026"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 14,
        top: 14,
        width: 84,
        height: 116,
        borderRadius: 16,
        overflow: 'hidden',
        background: cam ? 'linear-gradient(135deg,#5a3a22,#26180f)' : '#1a0f08',
        border: '1px solid rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, !cam ? /*#__PURE__*/React.createElement(Icon, {
      n: "video-off",
      size: 22,
      color: "rgba(255,255,255,.5)"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: '#fff'
      }
    }, "Du")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        padding: '18px 0 28px'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Mikrofon",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setMic(!mic)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: mic ? 'mic' : 'mic-off',
      size: 22,
      color: mic ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setCam(!cam)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: cam ? 'video' : 'video-off',
      size: 22,
      color: cam ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera wechseln",
      variant: "secondary",
      size: "lg",
      shape: "circle"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "switch-camera",
      size: 22,
      color: T.strong
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verlassen",
      variant: "primary",
      size: "lg",
      shape: "circle",
      onClick: onLeave,
      style: {
        background: 'var(--role-danger)',
        border: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "phone-off",
      size: 22,
      color: "#fff"
    }))));
  }

  /* ── Groups ─────────────────────────────────────────────────────────────── */
  /* iOS inset-grouped list: a white card with hairline separators between rows.
     On Material it preserves each screen's existing look (a filled card, or a
     plain gap-stacked list when materialWrap=false). */
  function GroupedRows({
    items,
    inset = 60,
    materialWrap = true
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement(Card, {
        padding: 0,
        style: {
          overflow: 'hidden'
        }
      }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, i ? /*#__PURE__*/React.createElement(Divider, {
        inset: inset
      }) : null, it)));
    }
    if (materialWrap) return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '6px 8px'
      }
    }, items);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, items);
  }
  function Groups({
    go,
    primaryAction
  }) {
    const items = D.groups.map(g => /*#__PURE__*/React.createElement(ListItem, {
      key: g.id,
      onClick: () => go({
        push: {
          screen: 'group',
          id: g.id
        }
      }),
      leading: /*#__PURE__*/React.createElement(Avatar, {
        fallback: g.initials,
        alt: g.name,
        size: 44
      }),
      title: g.name,
      subtitle: `${g.members} Mitglieder`,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    }));
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Gruppen",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 73,
      materialWrap: false
    }));
  }

  /* ── Profile ────────────────────────────────────────────────────────────── */
  function Profile({
    onSignOut
  }) {
    const [notify, setNotify] = React.useState(true);
    const rows = [{
      i: 'user-round',
      l: 'Persönliche Daten',
      a: {
        push: {
          screen: 'preferences'
        }
      }
    }, {
      i: 'bar-chart-3',
      l: 'Berichte',
      a: {
        push: {
          screen: 'reports'
        }
      }
    }, {
      i: 'calendar-cog',
      l: 'Verfügbarkeit verwalten',
      a: {
        push: {
          screen: 'availability'
        }
      }
    }];
    const items = [...rows.map(r => /*#__PURE__*/React.createElement(ListItem, {
      key: r.l,
      onClick: () => r.a && navTo(r.a),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: r.i,
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: r.l,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    })), /*#__PURE__*/React.createElement(ListItem, {
      key: "notify",
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "mail",
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: "E-Mail-Benachrichtigungen",
      trailing: /*#__PURE__*/React.createElement(Switch, {
        checked: notify,
        onChange: setNotify,
        ariaLabel: "E-Mail-Benachrichtigungen"
      })
    })];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Profil"
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: D.user.initials,
      alt: D.user.name,
      size: 56,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.01em'
      }
    }, D.user.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        opacity: .9
      }
    }, "Reiterin \xB7 Nord Eventing Academy"))), /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 58
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Abmelden",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "log-out",
        size: 16,
        color: T.strong
      }),
      onClick: onSignOut,
      style: {
        width: '100%'
      }
    }));
  }
  window.StridoScreens = {
    Login,
    Home,
    Videos,
    AssetDetail,
    Sessions,
    Call,
    Groups,
    Profile,
    Icon,
    NavHeader,
    Screen,
    TopBar,
    SectionHeader,
    Bell,
    videoStatus,
    T,
    setNav,
    navTo,
    setPlatform
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff_ui_kit/design-references/screens.jsx", error: String((e && e.message) || e) }); }

// handoff_ui_kit/design-references/screens2.jsx
try { (() => {
/* Strido mobile UI kit — additional screens (Material You).
 * Augments window.StridoScreens with the pushed/secondary views:
 * Notifications, Upload, BookSession, GroupDetail.
 * Reuses shared helpers (Icon, NavHeader, Screen, T) from screens.jsx.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button),
    IconButton = _w(DS.IconButton),
    Card = _w(DS.Card),
    Chip = _w(DS.Chip),
    Stepper = _w(DS.Stepper),
    SegmentedButton = _w(DS.SegmentedButton),
    Textarea = _w(DS.Textarea),
    TextInput = _w(DS.TextInput),
    ListItem = _w(DS.ListItem),
    Divider = _w(DS.Divider),
    Select = _w(DS.Select),
    Dialog = _w(DS.Dialog),
    Snackbar = _w(DS.Snackbar);
  const {
    Badge,
    Avatar,
    EmptyState,
    IconTile
  } = DS;
  const D = window.StridoData;
  const S = window.StridoScreens;
  const {
    Icon,
    NavHeader,
    T
  } = S;

  /* Full-height pushed-screen shell: fixed nav header + scroll body. */
  function Sheet({
    header,
    children,
    pad = 16,
    gap = 16,
    bottom = 28
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px ${bottom}px`
      }
    }, children)));
  }
  function SecTitle({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, children);
  }

  /* ── Notifications ──────────────────────────────────────────────────────── */
  const NOTIF_ICON = {
    review: 'message-circle',
    invite: 'user-plus',
    booking: 'calendar-check',
    upload: 'check-circle-2',
    system: 'sparkles'
  };
  function NotifRow({
    n,
    onAccept,
    onDecline
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 'var(--radius-tile)',
        background: n.unread ? 'var(--role-surface-1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: n.unread ? 'var(--role-accent-container)' : 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: NOTIF_ICON[n.kind] || 'bell',
      size: 19,
      color: n.unread ? 'var(--role-on-accent-container)' : T.muted,
      sw: 2.2
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: 700,
        color: T.strong
      }
    }, n.title), n.unread ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: 'var(--role-accent)',
        flexShrink: 0
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 3,
        fontSize: 13.5,
        lineHeight: 1.45,
        color: T.muted
      }
    }, n.body), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        fontSize: 12,
        color: T.muted
      }
    }, n.when), n.kind === 'invite' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Annehmen",
      onClick: onAccept,
      style: {
        padding: '8px 18px'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Ablehnen",
      variant: "secondary",
      onClick: onDecline,
      style: {
        padding: '8px 18px'
      }
    })) : null));
  }
  function Notifications({
    onBack
  }) {
    const [filter, setFilter] = React.useState('all');
    const [items, setItems] = React.useState(D.notificationList);
    const list = filter === 'unread' ? items.filter(n => n.unread) : items;
    const today = list.filter(n => n.day === 'today');
    const earlier = list.filter(n => n.day !== 'today');
    const unread = items.filter(n => n.unread).length;
    const markAll = () => setItems(xs => xs.map(n => ({
      ...n,
      unread: false
    })));
    const resolveInvite = id => setItems(xs => xs.filter(n => n.id !== id));
    const right = unread ? /*#__PURE__*/React.createElement("button", {
      onClick: markAll,
      "aria-label": "Alle als gelesen markieren",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check-check",
      size: 22,
      color: T.primaryStrong
    })) : null;
    function Group({
      label,
      rows
    }) {
      if (!rows.length) return null;
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: T.muted,
          padding: '0 4px 6px'
        }
      }, label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }
      }, rows.map(n => /*#__PURE__*/React.createElement(NotifRow, {
        key: n.id,
        n: n,
        onAccept: () => resolveInvite(n.id),
        onDecline: () => resolveInvite(n.id)
      }))));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Benachrichtigungen",
        onBack: onBack,
        right: right
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: filter,
      onChange: setFilter,
      segments: [{
        id: 'all',
        label: 'Alle'
      }, {
        id: 'unread',
        label: `Ungelesen${unread ? ` (${unread})` : ''}`
      }]
    }), list.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Group, {
      label: "Heute",
      rows: today
    }), /*#__PURE__*/React.createElement(Group, {
      label: "Fr\xFCher",
      rows: earlier
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 40
      }
    }, /*#__PURE__*/React.createElement(EmptyState, {
      title: "Alles gelesen",
      description: "Du bist auf dem neuesten Stand.",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "bell",
        size: 24,
        color: T.primary
      })
    })));
  }

  /* ── Upload (3-step) ────────────────────────────────────────────────────── */
  function Upload({
    onBack
  }) {
    const STEPS = ['files', 'details', 'review'];
    const [step, setStep] = React.useState('files');
    const [picked, setPicked] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [desc, setDesc] = React.useState('');
    const [groupId, setGroupId] = React.useState(D.groups[0].id);
    const idx = STEPS.indexOf(step);
    const stState = s => {
      const i = STEPS.indexOf(s);
      return i < idx ? 'completed' : i === idx ? 'active' : 'upcoming';
    };
    const groupName = D.groups.find(g => g.id === groupId)?.name || '';
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Video hochladen",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement("button", {
          onClick: onBack,
          "aria-label": "Abbrechen",
          style: {
            all: 'unset',
            cursor: 'pointer',
            padding: '0 14px',
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: T.muted
          }
        }, "Abbrechen")
      })
    }, /*#__PURE__*/React.createElement(Stepper, {
      steps: [{
        label: 'Datei',
        state: stState('files')
      }, {
        label: 'Details',
        state: stState('details')
      }, {
        label: 'Hochladen',
        state: stState('review')
      }]
    }), step === 'files' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPicked(true),
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '28px 16px',
        borderRadius: 16,
        border: '1.5px dashed var(--role-outline)',
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 30,
      color: T.primaryStrong,
      sw: 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.strong
      }
    }, "Video ausw\xE4hlen"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5
      }
    }, "MP4 oder MOV \xB7 auch mehrteilig")), picked ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "file-video",
      size: 18,
      color: T.primaryStrong
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 700,
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, "combination-line-2.mp4"), /*#__PURE__*/React.createElement(IconButton, {
      label: "Entfernen",
      variant: "ghost",
      size: "sm",
      onClick: () => setPicked(false)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "x",
      size: 16,
      color: T.muted
    }))) : null, /*#__PURE__*/React.createElement(Button, {
      label: "Weiter",
      disabled: !picked,
      onClick: () => setStep('details'),
      style: {
        alignSelf: 'flex-end'
      }
    })) : null, step === 'details' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 6
      }
    }, "Titel"), /*#__PURE__*/React.createElement(TextInput, {
      value: title,
      onChange: setTitle,
      placeholder: "z. B. Kombination \u2014 Versuch 3"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 6
      }
    }, "Beschreibung"), /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Worauf soll der Coach achten?"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 8
      }
    }, "Gruppe"), /*#__PURE__*/React.createElement(Select, {
      value: groupId,
      onChange: setGroupId,
      options: D.groups.map(g => ({
        value: g.id,
        label: g.name
      }))
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Zur\xFCck",
      variant: "secondary",
      onClick: () => setStep('files')
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Weiter",
      onClick: () => setStep('review')
    }))) : null, step === 'review' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'var(--role-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 20,
      color: "var(--role-on-accent-container)",
      sw: 2.6
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, "Bereit zum Hochladen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, "Der Upload l\xE4uft im Hintergrund weiter."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 14,
        borderRadius: 12,
        border: '1px solid var(--role-outline)'
      }
    }, /*#__PURE__*/React.createElement(Row, {
      k: "Titel",
      v: title || '—'
    }), /*#__PURE__*/React.createElement(Row, {
      k: "Gruppe",
      v: groupName
    }), /*#__PURE__*/React.createElement(Row, {
      k: "Dateien",
      v: "1"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Zur\xFCck",
      variant: "secondary",
      onClick: () => setStep('details')
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Upload starten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "upload",
        size: 16,
        color: "currentColor"
      }),
      onClick: onBack
    }))) : null);
  }
  function Row({
    k,
    v
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--role-on-surface)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, k, ": "), v);
  }

  /* ── Book a session — SOTA stepped flow ─────────────────────────────────────
   * Reworked from the old single-scroll accordion (decorative stepper + bare
   * expert chips + global time-chips + buried CTA). Now: one decision per step,
   * the mental order What → Who → When, a working/tappable progress indicator,
   * per-expert availability with a date rail + time grid, and a persistent
   * summary bar that always shows price + selection and carries the one CTA.
   */
  function fmtPrice(n) {
    return `${n} €`;
  }
  function addMins(hhmm, mins) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + mins;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  /* Rich, tappable selection row used for session type + expert. */
  function PickRow({
    selected,
    onClick,
    leading,
    title,
    meta,
    sub,
    trailing
  }) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClick,
      "aria-pressed": selected,
      style: {
        all: 'unset',
        cursor: 'pointer',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 'var(--radius-card)',
        background: selected ? 'var(--role-accent-container)' : 'var(--role-surface-1)',
        color: selected ? 'var(--role-on-accent-container)' : T.strong,
        boxShadow: selected ? 'inset 0 0 0 2px var(--role-accent)' : 'none',
        transition: 'background-color .14s ease, box-shadow .14s ease'
      }
    }, leading, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 15.5,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), meta), sub ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.4,
        color: selected ? 'inherit' : T.muted,
        opacity: selected ? 0.85 : 1,
        marginTop: 3
      }
    }, sub) : null), trailing);
  }
  function Stars({
    rating,
    reviews,
    on
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12.5,
        fontWeight: 700,
        color: on ? 'inherit' : T.strong
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "star",
      size: 13,
      color: "var(--role-warning)",
      sw: 2.4
    }), rating.toFixed(1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: on ? 'inherit' : T.muted,
        opacity: on ? 0.8 : 1
      }
    }, "(", reviews, ")"));
  }
  function BookSession({
    onBack
  }) {
    const C = D.coaching;
    const [step, setStep] = React.useState(1); // 1 Art · 2 Experte · 3 Zeit · 4 Bestätigen
    const [reached, setReached] = React.useState(1);
    const [typeId, setTypeId] = React.useState('');
    const [expertId, setExpertId] = React.useState(''); // '' | 'any' | eN
    const [dayId, setDayId] = React.useState('');
    const [time, setTime] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [booked, setBooked] = React.useState(false);
    const type = C.sessionTypes.find(t => t.id === typeId);

    // Which concrete experts can serve on a given day, and the resolved expert
    // when the rider picked "egal" (first available that day).
    const expertsOnDay = dId => C.experts.filter(e => (C.availability[e.id] || {})[dId]);
    const resolvedExpertId = expertId === 'any' ? dayId ? (expertsOnDay(dayId)[0] || {}).id : C.experts[0].id : expertId;
    const expert = C.experts.find(e => e.id === resolvedExpertId);

    // Availability for the date rail depends on the chosen expert (or "egal" = union).
    const dayHasSlots = dId => expertId === 'any' ? expertsOnDay(dId).length > 0 : !!(C.availability[expertId] || {})[dId];
    const slotsForDay = dId => {
      if (!dId) return [];
      if (expertId === 'any') {
        const all = new Set();
        expertsOnDay(dId).forEach(e => (C.availability[e.id][dId] || []).forEach(t => all.add(t)));
        return [...all].sort();
      }
      return ((C.availability[expertId] || {})[dId] || []).slice().sort();
    };
    const day = C.days.find(d => d.id === dayId);
    const dayTimes = slotsForDay(dayId);
    const goStep = n => {
      setStep(n);
      setReached(r => Math.max(r, n));
    };
    const reset = () => {
      setExpertId('');
      setDayId('');
      setTime('');
    };

    // Per-step gate for the summary-bar CTA.
    const canNext = step === 1 ? !!typeId : step === 2 ? !!expertId : step === 3 ? !!time : true;
    const next = () => {
      if (step < 4) goStep(step + 1);else setBooked(true);
    };
    const smartBack = () => {
      if (step > 1) setStep(step - 1);else onBack();
    };
    const stState = i => i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'upcoming';
    const onStepPress = i => {
      if (i + 1 <= reached) setStep(i + 1);
    };

    /* ---- Confirmation ---- */
    if (booked) {
      return /*#__PURE__*/React.createElement(Sheet, {
        header: /*#__PURE__*/React.createElement(NavHeader, {
          title: "Gebucht"
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
          padding: '52px 20px 16px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 64,
          height: 64,
          borderRadius: 22,
          background: 'var(--role-success-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 32,
        color: "var(--role-on-success-container)",
        sw: 2.8
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 800,
          color: T.strong,
          letterSpacing: '-0.015em'
        }
      }, "Termin best\xE4tigt"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted,
          maxWidth: 290,
          marginTop: 6
        }
      }, "Wir haben dir und ", expert?.name, " eine Best\xE4tigung geschickt. Eine Erinnerung folgt 24 Std vorher.")), /*#__PURE__*/React.createElement(Card, {
        tone: "surface",
        style: {
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        fallback: expert?.initials,
        alt: expert?.name,
        size: 44,
        shape: "circle"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 800,
          color: T.strong
        }
      }, type?.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: T.muted,
          marginTop: 2
        }
      }, day?.dow, " ", day?.date, ". ", day?.month, " \xB7 ", time, "\u2013", addMins(time, type.mins))), /*#__PURE__*/React.createElement(Badge, {
        label: fmtPrice(type.price),
        tone: "primary"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          marginTop: 4
        }
      }, /*#__PURE__*/React.createElement(Button, {
        label: "Zum Kalender hinzuf\xFCgen",
        variant: "secondary",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "calendar-plus",
          size: 16,
          color: T.strong
        }),
        style: {
          width: '100%'
        }
      }), /*#__PURE__*/React.createElement(Button, {
        label: "Fertig",
        onClick: onBack,
        style: {
          width: '100%'
        }
      }))));
    }
    const STEP_LABELS = ['Art', 'Experte', 'Zeit', 'Details'];

    /* ---- Step bodies ---- */
    let bodyContent = null;
    if (step === 1) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Was m\xF6chtest du buchen?"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 12
        }
      }, C.sessionTypes.map(st => /*#__PURE__*/React.createElement(PickRow, {
        key: st.id,
        selected: typeId === st.id,
        onClick: () => {
          setTypeId(st.id);
          reset();
        },
        leading: /*#__PURE__*/React.createElement(IconTile, {
          tone: typeId === st.id ? 'accent' : 'neutral',
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: st.icon,
            size: 20,
            color: typeId === st.id ? 'var(--role-on-accent-container)' : T.primaryStrong
          })
        }),
        title: st.name,
        meta: /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 15,
            fontWeight: 800
          }
        }, fmtPrice(st.price)),
        sub: `${st.mins} Min · ${st.desc}`
      }))));
    } else if (step === 2) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Mit wem?"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 12
        }
      }, /*#__PURE__*/React.createElement(PickRow, {
        selected: expertId === 'any',
        onClick: () => {
          setExpertId('any');
          setDayId('');
          setTime('');
        },
        leading: /*#__PURE__*/React.createElement(IconTile, {
          tone: expertId === 'any' ? 'accent' : 'neutral',
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "sparkles",
            size: 20,
            color: expertId === 'any' ? 'var(--role-on-accent-container)' : T.primaryStrong
          })
        }),
        title: "Erste*r verf\xFCgbare*r",
        sub: "Schnellster Termin \u2014 Trainer*in wird automatisch zugewiesen"
      }), C.experts.map(e => /*#__PURE__*/React.createElement(PickRow, {
        key: e.id,
        selected: expertId === e.id,
        onClick: () => {
          setExpertId(e.id);
          setDayId('');
          setTime('');
        },
        leading: /*#__PURE__*/React.createElement(Avatar, {
          fallback: e.initials,
          alt: e.name,
          size: 44,
          shape: "circle"
        }),
        title: e.name,
        meta: /*#__PURE__*/React.createElement(Stars, {
          rating: e.rating,
          reviews: e.reviews,
          on: expertId === e.id
        }),
        sub: `${e.role} · ${e.specialty}`
      }))));
    } else if (step === 3) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Wann passt es dir?"), /*#__PURE__*/React.createElement("div", {
        className: "m-scroll",
        style: {
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          margin: '12px -16px 0',
          padding: '0 16px 2px'
        }
      }, C.days.map(d => {
        const avail = dayHasSlots(d.id);
        const sel = dayId === d.id;
        return /*#__PURE__*/React.createElement("button", {
          key: d.id,
          type: "button",
          disabled: !avail,
          onClick: () => {
            setDayId(d.id);
            setTime('');
          },
          style: {
            all: 'unset',
            flexShrink: 0,
            cursor: avail ? 'pointer' : 'not-allowed',
            width: 54,
            padding: '10px 0',
            borderRadius: 16,
            textAlign: 'center',
            background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
            color: sel ? 'var(--role-on-accent)' : avail ? T.strong : T.muted,
            opacity: avail ? 1 : 0.4,
            transition: 'background-color .14s ease'
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            opacity: 0.8
          }
        }, d.isToday ? 'Heute' : d.dow), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 19,
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 2
          }
        }, d.date), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.75
          }
        }, d.month));
      })), !dayId ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted,
          marginTop: 16,
          padding: '0 2px'
        }
      }, "W\xE4hle zuerst einen Tag.") : dayTimes.length === 0 ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted,
          marginTop: 16
        }
      }, "Keine freien Termine an diesem Tag.") : /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginTop: 16
        }
      }, dayTimes.map(tm => {
        const sel = time === tm;
        return /*#__PURE__*/React.createElement("button", {
          key: tm,
          type: "button",
          onClick: () => setTime(tm),
          style: {
            all: 'unset',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 14.5,
            fontWeight: 700,
            background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
            color: sel ? 'var(--role-on-accent)' : T.strong,
            boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--role-outline)',
            transition: 'background-color .14s ease'
          }
        }, tm);
      })), dayId && dayTimes.length > 0 ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.muted,
          marginTop: 12
        }
      }, "Dauer ", type.mins, " Min", expertId === 'any' ? ' · Trainer*in wird zugewiesen' : '') : null);
    } else {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Stimmt das so?"), /*#__PURE__*/React.createElement(Card, {
        tone: "surface",
        style: {
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        }
      }, /*#__PURE__*/React.createElement(SummaryRow, {
        icon: type.icon,
        k: "Session",
        v: `${type.name} · ${type.mins} Min`
      }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SummaryRow, {
        avatar: expert,
        k: expertId === 'any' ? 'Trainer*in (zugewiesen)' : 'Trainer*in',
        v: expert?.name,
        sub: expert?.specialty
      }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SummaryRow, {
        icon: "calendar-clock",
        k: "Termin",
        v: `${day?.isToday ? 'Heute' : day?.dow} ${day?.date}. ${day?.month}`,
        sub: `${time}–${addMins(time, type.mins)} Uhr`
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 14
        }
      }, /*#__PURE__*/React.createElement(SecTitle, null, "Notiz an die*den Trainer*in"), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 10
        }
      }, /*#__PURE__*/React.createElement(Textarea, {
        value: notes,
        onChange: setNotes,
        rows: 3,
        placeholder: "z. B. Woran m\xF6chtest du arbeiten? (optional)"
      }))));
    }

    /* ---- Summary bar (persistent footer) ---- */
    const ctaLabel = step < 4 ? 'Weiter' : `Buchen · ${fmtPrice(type ? type.price : 0)}`;
    const footer = /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        borderTop: '1px solid var(--role-outline)',
        background: T.bg,
        padding: '12px 16px',
        paddingBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, type ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, fmtPrice(type.price)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, type.name, expert ? ` · ${expert.name}` : '', time ? ` · ${time}` : '')) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted
      }
    }, "W\xE4hle eine Session-Art")), /*#__PURE__*/React.createElement(Button, {
      label: ctaLabel,
      disabled: !canNext,
      onClick: next,
      style: {
        minWidth: 132
      }
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: "Session buchen",
      onBack: smartBack,
      right: /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        "aria-label": "Abbrechen",
        style: {
          all: 'unset',
          cursor: 'pointer',
          padding: '0 14px',
          height: 44,
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: T.muted
        }
      }, "Abbrechen")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 8px 14px'
      }
    }, /*#__PURE__*/React.createElement(Stepper, {
      onStepPress: onStepPress,
      steps: STEP_LABELS.map((l, i) => ({
        label: l,
        state: stState(i)
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 16px 20px'
      }
    }, bodyContent)), footer);
  }

  /* Summary line for the confirm step (icon or avatar · label · value · sub). */
  function SummaryRow({
    icon,
    avatar,
    k,
    v,
    sub
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0'
      }
    }, avatar ? /*#__PURE__*/React.createElement(Avatar, {
      fallback: avatar.initials,
      alt: avatar.name,
      size: 38,
      shape: "circle"
    }) : /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      size: 38,
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: icon,
        size: 18,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
      }
    }, k), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong,
        marginTop: 1
      }
    }, v), sub ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        marginTop: 1
      }
    }, sub) : null));
  }

  /* ── Group detail ───────────────────────────────────────────────────────── */
  function MemberRow({
    m
  }) {
    return /*#__PURE__*/React.createElement(ListItem, {
      leading: /*#__PURE__*/React.createElement(Avatar, {
        fallback: m.initials,
        alt: m.name,
        size: 38,
        shape: "circle"
      }),
      title: m.name,
      subtitle: m.role
    });
  }
  function MemberCard({
    icon,
    title,
    count,
    desc,
    members
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: icon,
        size: 19,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, title), /*#__PURE__*/React.createElement(Badge, {
      label: String(count)
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, desc))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, members.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: m.id
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 50
    }) : null, /*#__PURE__*/React.createElement(MemberRow, {
      m: m
    })))));
  }
  function GroupDetail({
    id,
    onBack
  }) {
    const g = D.groups.find(x => x.id === id) || D.groups[0];
    const detail = D.groupMembers[g.id] || {
      desc: '',
      experts: [],
      students: []
    };
    const [leave, setLeave] = React.useState(false);
    const [snack, setSnack] = React.useState(false);
    const settings = /*#__PURE__*/React.createElement("button", {
      "aria-label": "Einstellungen",
      onClick: () => S.navTo({
        push: {
          screen: 'groupPrefs',
          id: g.id
        }
      }),
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "settings",
      size: 22,
      color: T.primaryStrong
    }));
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: g.name,
        onBack: onBack,
        right: settings
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: g.initials,
      alt: g.name,
      size: 56
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 21,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, g.members, " Mitglieder"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 1.5,
        color: T.muted
      }
    }, detail.desc), /*#__PURE__*/React.createElement(Card, {
      tone: "surface"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "qr-code",
        size: 19,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, "Mitglieder einladen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, "Teile einen Link oder QR-Code, um Reiter hinzuzuf\xFCgen."))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        flexShrink: 0,
        borderRadius: 12,
        border: '1px dashed var(--role-outline)',
        background: 'var(--role-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "qr-code",
      size: 40,
      color: T.muted,
      sw: 1.5
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Link kopieren",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "copy",
        size: 16,
        color: "var(--role-on-secondary-container)"
      }),
      onClick: () => setSnack(true),
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "QR teilen",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "share-2",
        size: 16,
        color: T.strong
      }),
      style: {
        width: '100%'
      }
    })))), /*#__PURE__*/React.createElement(MemberCard, {
      icon: "award",
      title: "Experten",
      count: detail.experts.length,
      desc: "Trainer, die Videos pr\xFCfen und Coaching anbieten.",
      members: detail.experts
    }), /*#__PURE__*/React.createElement(MemberCard, {
      icon: "users",
      title: "Reiter",
      count: detail.students.length,
      desc: "Mitglieder dieser Gruppe.",
      members: detail.students
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe verlassen",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "log-out",
        size: 16,
        color: "var(--role-danger)"
      }),
      onClick: () => setLeave(true),
      style: {
        width: '100%',
        color: 'var(--role-danger)',
        borderColor: 'var(--role-danger)'
      }
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: leave,
      tone: "danger",
      title: "Gruppe verlassen?",
      description: `Du verlierst den Zugriff auf Videos und Coaching von „${g.name}“.`,
      confirmLabel: "Verlassen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setLeave(false);
        onBack();
      },
      onCancel: () => setLeave(false)
    }), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "Einladungslink kopiert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }
  Object.assign(window.StridoScreens, {
    Notifications,
    Upload,
    BookSession,
    GroupDetail
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff_ui_kit/design-references/screens2.jsx", error: String((e && e.message) || e) }); }

// handoff_ui_kit/design-references/screens3.jsx
try { (() => {
/* Strido mobile UI kit — secondary screens, part 3 (Material You ↔ iOS).
 * Adds the five flows the click-through was missing — each one wired to a
 * previously dead-end entry point:
 *   CreateGroup     ← Gruppen → „Gruppe erstellen“
 *   GroupPreferences ← GruppenDetail → Zahnrad
 *   Invite          ← Gruppen → „Gruppe beitreten“ (QR/Code)
 *   Reports         ← Profil → „Berichte“
 *   Availability    ← Profil → „Verfügbarkeit verwalten“
 * Reuses shared helpers (Icon, NavHeader, T) from screens.jsx.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button),
    IconButton = _w(DS.IconButton),
    Card = _w(DS.Card),
    Chip = _w(DS.Chip),
    Tabs = _w(DS.Tabs),
    TextInput = _w(DS.TextInput),
    Textarea = _w(DS.Textarea),
    Select = _w(DS.Select),
    ListItem = _w(DS.ListItem),
    Divider = _w(DS.Divider),
    Dialog = _w(DS.Dialog),
    Snackbar = _w(DS.Snackbar),
    Switch = _w(DS.Switch),
    FieldLabel = _w(DS.FieldLabel);
  const {
    FieldError,
    Badge,
    Avatar,
    EmptyState,
    IconTile,
    Fab
  } = DS;
  const D = window.StridoData;
  const S = window.StridoScreens;
  const {
    Icon,
    NavHeader,
    T
  } = S;

  /* Full-height pushed-screen shell: fixed nav header + scroll body. */
  function Sheet({
    header,
    children,
    pad = 16,
    gap = 16,
    bottom = 28
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px ${bottom}px`
      }
    }, children)));
  }
  function SecTitle({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, children);
  }
  function CancelBtn({
    onBack
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Abbrechen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: T.muted
      }
    }, "Abbrechen");
  }

  /* Round avatar picker (create / edit group). Tappable; toggles a filled state to
     stand in for a chosen image. Pflichtfeld — drives the parent's submit guard. */
  function AvatarInput({
    filled,
    onPick,
    initials = '',
    size = 88
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onPick,
      "aria-label": "Gruppenbild w\xE4hlen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: filled ? 'var(--role-accent-container)' : 'var(--role-surface-2)',
        border: filled ? 'none' : '1.5px dashed var(--role-outline)'
      }
    }, filled ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: size * 0.34,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, initials || 'NG') : /*#__PURE__*/React.createElement(Icon, {
      n: "camera",
      size: 26,
      color: T.muted,
      sw: 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--role-accent)',
        border: '2.5px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: filled ? 'pencil' : 'plus',
      size: 15,
      color: "var(--role-on-accent)",
      sw: 2.4
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, filled ? 'Bild ändern' : 'Gruppenbild (erforderlich)'));
  }

  /* Reusable labelled field wrapper. */
  function Field({
    label,
    hint,
    error,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(FieldLabel, null, label), children, error ? /*#__PURE__*/React.createElement(FieldError, null, error) : hint ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, hint) : null);
  }

  /* ── Create group ───────────────────────────────────────────────────────── */
  function CreateGroup({
    onBack
  }) {
    const [name, setName] = React.useState('');
    const [avatar, setAvatar] = React.useState(false);
    const [desc, setDesc] = React.useState('');
    const [touched, setTouched] = React.useState(false);
    const nameEmpty = name.trim().length === 0;
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    function submit() {
      setTouched(true);
      if (nameEmpty || !avatar) return;
      onBack();
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe erstellen",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: avatar,
      initials: initials,
      onPick: () => setAvatar(v => !v)
    })), touched && !avatar ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginTop: -8
      }
    }, /*#__PURE__*/React.createElement(FieldError, null, "Ein Gruppenbild ist erforderlich.")) : null, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name",
      error: touched && nameEmpty ? 'Bitte gib einen Namen ein.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "z. B. Nord Eventing Academy",
      invalid: touched && nameEmpty
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung",
      hint: "Optional \u2014 wof\xFCr ist diese Gruppe?"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe erstellen",
      disabled: nameEmpty || !avatar,
      onClick: submit,
      style: {
        width: '100%'
      }
    }));
  }

  /* ── Group preferences (edit + danger zone) ─────────────────────────────── */
  function GroupPreferences({
    id,
    onBack
  }) {
    const g = D.groups.find(x => x.id === id) || D.groups[0];
    const detail = D.groupMembers[g.id] || {
      desc: ''
    };
    const [name, setName] = React.useState(g.name);
    const [desc, setDesc] = React.useState(detail.desc || '');
    const [del, setDel] = React.useState(false);
    const [leave, setLeave] = React.useState(false);
    const [snack, setSnack] = React.useState(false);
    const dirty = name.trim() !== g.name || (desc || '') !== (detail.desc || '');
    const save = /*#__PURE__*/React.createElement("button", {
      onClick: () => dirty && setSnack(true),
      "aria-label": "Speichern",
      disabled: !dirty,
      style: {
        all: 'unset',
        cursor: dirty ? 'pointer' : 'default',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: dirty ? T.primaryStrong : T.muted
      }
    }, "Speichern");
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Einstellungen",
        onBack: onBack,
        right: save
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: true,
      initials: g.initials,
      onPick: () => {}
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "Gruppenname"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--role-danger)',
        padding: '4px 4px 0'
      }
    }, "Gefahrenzone"), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '4px 8px',
        border: '1px solid var(--role-danger-container)'
      }
    }, /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setLeave(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "log-out",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe verlassen"),
      subtitle: "Du verlierst den Zugriff auf Videos und Coaching."
    }), /*#__PURE__*/React.createElement(Divider, {
      inset: 58
    }), /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setDel(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "trash-2",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe l\xF6schen"),
      subtitle: "Endg\xFCltig \u2014 kann nicht r\xFCckg\xE4ngig gemacht werden."
    })), /*#__PURE__*/React.createElement(Dialog, {
      open: leave,
      tone: "danger",
      title: "Gruppe verlassen?",
      description: `Du verlierst den Zugriff auf „${g.name}“.`,
      confirmLabel: "Verlassen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setLeave(false);
        onBack();
      },
      onCancel: () => setLeave(false)
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: del,
      tone: "danger",
      title: "Gruppe l\xF6schen?",
      description: `„${g.name}“ und alle Videos und Sessions werden dauerhaft entfernt.`,
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setDel(false);
        onBack();
      },
      onCancel: () => setDel(false)
    }), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "\xC4nderungen gespeichert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }

  /* ── Invite (scan QR / enter code → confirm) ────────────────────────────── */
  function Invite({
    onBack
  }) {
    const [code, setCode] = React.useState('');
    const [confirm, setConfirm] = React.useState(null); // group object once a code resolves
    const [bad, setBad] = React.useState(false);
    function lookup(raw) {
      const c = (raw || code).trim().toUpperCase();
      if (c.length < 4) {
        setBad(true);
        return;
      }
      setBad(false);
      // Resolve to a sample group (any code is accepted in the kit).
      setConfirm(D.groups[0]);
    }
    if (confirm) {
      const det = D.groupMembers[confirm.id] || {
        desc: ''
      };
      return /*#__PURE__*/React.createElement(Sheet, {
        header: /*#__PURE__*/React.createElement(NavHeader, {
          title: "Einladung",
          onBack: () => setConfirm(null)
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 8,
          padding: '28px 8px 8px'
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        fallback: confirm.initials,
        alt: confirm.name,
        size: 72
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 21,
          fontWeight: 800,
          color: T.strong,
          letterSpacing: '-0.01em'
        }
      }, confirm.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted
        }
      }, confirm.members, " Mitglieder \xB7 Eingeladen von Coach Petra")), /*#__PURE__*/React.createElement(Card, {
        tone: "surface"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted
        }
      }, det.desc)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        label: "Gruppe beitreten",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "check",
          size: 18,
          color: "currentColor",
          sw: 2.4
        }),
        onClick: onBack,
        style: {
          width: '100%'
        }
      }), /*#__PURE__*/React.createElement(Button, {
        label: "Ablehnen",
        variant: "secondary",
        onClick: () => setConfirm(null),
        style: {
          width: '100%'
        }
      })));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe beitreten",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, #241509 0 14px, #1a0f08 14px 28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 168,
        height: 168,
        borderRadius: 24,
        border: '3px solid rgba(255,255,255,.9)',
        boxShadow: '0 0 0 9999px rgba(0,0,0,.28)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "qr-code",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }), "QR-Code im Rahmen platzieren")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted
      }
    }, "oder Code eingeben"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Einladungscode",
      error: bad ? 'Code ungültig — bitte prüfen.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: code,
      onChange: v => {
        setCode(v);
        setBad(false);
      },
      placeholder: "z. B. NEA-2K9",
      invalid: bad
    })), /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      disabled: !code.trim(),
      onClick: () => lookup(),
      style: {
        width: '100%'
      }
    })));
  }

  /* ── Reports (activity summary) ─────────────────────────────────────────── */
  function StatTile({
    icon,
    tone,
    label,
    count,
    footer
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        flex: 1,
        minWidth: 0,
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: tone,
      icon: icon
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em',
        lineHeight: 1
      }
    }, count), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2
      }
    }, footer));
  }
  function Reports({
    onBack
  }) {
    const R = D.reports;
    const [gran, setGran] = React.useState('month');
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Berichte",
        onBack: onBack
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      activeId: gran,
      onChange: setGran,
      tabs: [{
        id: 'month',
        label: 'Monat'
      }, {
        id: 'quarter',
        label: 'Quartal'
      }, {
        id: 'year',
        label: 'Jahr'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Vorheriger Zeitraum",
      variant: "ghost",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-left",
      size: 20,
      color: T.muted
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong
      }
    }, R.period), /*#__PURE__*/React.createElement(IconButton, {
      label: "N\xE4chster Zeitraum",
      variant: "ghost",
      size: "sm",
      disabled: true
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 20,
      color: "var(--role-outline)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "film",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Videos",
      count: R.videoCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: R.videoDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 20,
        color: "var(--role-success)"
      }),
      label: "Live-Coaching",
      count: R.liveCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        tone: "success",
        label: R.liveDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "users",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Reiter",
      count: R.peopleCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: `in ${R.groupCount} Gruppen`
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Aktivit\xE4t"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Badge, {
      label: `${R.events.length} im ${R.period}`
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, R.events.map(e => {
      const vid = e.kind === 'video';
      return /*#__PURE__*/React.createElement(Card, {
        key: e.id,
        tone: "surface",
        padding: 0,
        style: {
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(IconTile, {
        tone: vid ? 'neutral' : 'success',
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: vid ? 'film' : 'video',
          size: 18,
          color: vid ? T.primaryStrong : 'var(--role-success)'
        })
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.who, " \xB7 ", e.group, " \xB7 ", e.date)), /*#__PURE__*/React.createElement(Badge, {
        tone: vid ? 'neutral' : 'success',
        label: e.dur
      }));
    })));
  }

  /* ── Availability (manage session types / schedule / blocked) ───────────────
     Rethought for mobile (Heinrich): the intro card and the full-width add button
     are gone; sections are a single grouped list (hairline dividers, M3 style)
     and the section-aware create action is a Material FAB (iOS → nav-bar "+"). */
  function Availability({
    onBack
  }) {
    const A = D.availability;
    const ios = isIOS();
    const [groupId, setGroupId] = React.useState(D.groups[0].id);
    const [tab, setTab] = React.useState('types');
    const [add, setAdd] = React.useState(null); // which add-dialog is open
    const [del, setDel] = React.useState(null); // pending delete label
    const [fullDay, setFullDay] = React.useState(true);
    function rows() {
      if (tab === 'types') return A.sessionTypes.map(st => ({
        key: st.id,
        del: st.name,
        edit: () => setAdd('types'),
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            flex: '0 1 auto',
            minWidth: 0,
            fontSize: 15,
            fontWeight: 700,
            color: T.strong,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }, st.name), /*#__PURE__*/React.createElement("span", {
          style: {
            flexShrink: 0
          }
        }, /*#__PURE__*/React.createElement(Badge, {
          tone: "primary",
          label: `${st.mins} Min`
        }))), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 3,
            lineHeight: 1.4
          }
        }, st.desc))
      }));
      if (tab === 'schedule') return A.schedule.map(s => ({
        key: s.id,
        del: s.day,
        edit: () => setAdd('schedule'),
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement(IconTile, {
          tone: "neutral",
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "calendar",
            size: 18,
            color: T.primaryStrong
          })
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 15,
            fontWeight: 700,
            color: T.strong
          }
        }, s.day), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 1
          }
        }, s.from, " \u2013 ", s.to)))
      }));
      return A.blocked.map(b => ({
        key: b.id,
        del: b.date,
        edit: null,
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement(IconTile, {
          tone: "neutral",
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "calendar-off",
            size: 18,
            color: "var(--role-danger)"
          })
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 15,
            fontWeight: 700,
            color: T.strong
          }
        }, b.date), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 1
          }
        }, b.range, b.reason ? ` · ${b.reason}` : '')))
      }));
    }
    const list = rows();
    const addAtTab = /*#__PURE__*/React.createElement("button", {
      onClick: () => setAdd(tab),
      "aria-label": "Hinzuf\xFCgen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--role-accent)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "plus",
      size: 24,
      color: "var(--role-accent)",
      sw: 2.4
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: "Verf\xFCgbarkeit",
      onBack: onBack,
      right: ios ? addAtTab : null
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '12px 16px 104px'
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Gruppe"
    }, /*#__PURE__*/React.createElement(Select, {
      value: groupId,
      onChange: setGroupId,
      options: D.groups.map(g => ({
        value: g.id,
        label: g.name
      }))
    })), /*#__PURE__*/React.createElement(Tabs, {
      activeId: tab,
      onChange: setTab,
      tabs: [{
        id: 'types',
        label: 'Session-Typen'
      }, {
        id: 'schedule',
        label: 'Wochenplan'
      }, {
        id: 'blocked',
        label: 'Geblockt'
      }]
    }), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '2px 6px'
      }
    }, list.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.key
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 16
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 6px 10px 10px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, r.node), r.edit ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Bearbeiten",
      variant: "ghost",
      size: "sm",
      onClick: r.edit
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pencil",
      size: 17,
      color: T.muted
    })) : null, /*#__PURE__*/React.createElement(IconButton, {
      label: "L\xF6schen",
      variant: "ghost",
      size: "sm",
      onClick: () => setDel(r.del)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash-2",
      size: 17,
      color: "var(--role-danger)"
    })))))))), !ios ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        zIndex: 30
      }
    }, /*#__PURE__*/React.createElement(Fab, {
      extended: true,
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "plus",
        size: 20,
        color: "var(--role-on-accent)",
        sw: 2.4
      }),
      label: "Hinzuf\xFCgen",
      onClick: () => setAdd(tab)
    })) : null, /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'types',
      title: "Session-Typ",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Video-Review"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Dauer"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "30",
      options: [{
        value: '30',
        label: '30 Minuten'
      }, {
        value: '45',
        label: '45 Minuten'
      }, {
        value: '60',
        label: '60 Minuten'
      }]
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      rows: 2,
      placeholder: "Was umfasst diese Session?"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'schedule',
      title: "Zeitfenster",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Wochentag"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "mon",
      options: [{
        value: 'mon',
        label: 'Montag'
      }, {
        value: 'tue',
        label: 'Dienstag'
      }, {
        value: 'wed',
        label: 'Mittwoch'
      }, {
        value: 'thu',
        label: 'Donnerstag'
      }, {
        value: 'fri',
        label: 'Freitag'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Von"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "16:00"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Bis"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "19:00"
    })))))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'blocked',
      title: "Tag blockieren",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Datum"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "Fr 27 Jun"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        color: T.strong
      }
    }, "Ganzer Tag"), /*#__PURE__*/React.createElement(Switch, {
      checked: fullDay,
      onChange: setFullDay,
      ariaLabel: "Ganzer Tag"
    })), !fullDay ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Von"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "14:00"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Bis"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "17:00"
    })))) : null, /*#__PURE__*/React.createElement(Field, {
      label: "Grund",
      hint: "Optional"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Turnier"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: !!del,
      tone: "danger",
      title: "Wirklich l\xF6schen?",
      description: del ? `„${del}“ wird entfernt.` : '',
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => setDel(null),
      onCancel: () => setDel(null)
    }));
  }

  /* ── Preferences (personal data + email prefs) — the Profil → „Persönliche
     Daten“ destination, mirroring the app's profile preferences. ─────────────── */
  function Preferences({
    onBack
  }) {
    const u = D.user;
    const [name, setName] = React.useState(u.name);
    const [lang, setLang] = React.useState(u.language);
    const [tz, setTz] = React.useState(u.timezone);
    const [prefs, setPrefs] = React.useState({
      feedback: true,
      bookings: true,
      invites: false
    });
    const [snack, setSnack] = React.useState(false);
    const toggle = k => setPrefs(p => ({
      ...p,
      [k]: !p[k]
    }));
    const save = /*#__PURE__*/React.createElement("button", {
      onClick: () => setSnack(true),
      "aria-label": "Speichern",
      style: {
        all: 'unset',
        cursor: 'pointer',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, "Speichern");
    const NOTES = [{
      k: 'feedback',
      l: 'Neues Feedback',
      d: 'Wenn ein Experte dein Video kommentiert.'
    }, {
      k: 'bookings',
      l: 'Buchungsbestätigungen',
      d: 'Bestätigungen und Erinnerungen.'
    }, {
      k: 'invites',
      l: 'Gruppeneinladungen',
      d: 'Einladungen in neue Gruppen.'
    }];
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Pers\xF6nliche Daten",
        onBack: onBack,
        right: save
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: true,
      initials: u.initials,
      onPick: () => {}
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "Dein Name"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "E-Mail",
      hint: "Wird f\xFCr die Anmeldung verwendet."
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: u.email,
      onChange: () => {},
      disabled: true
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Sprache"
    }, /*#__PURE__*/React.createElement(Select, {
      value: lang,
      onChange: setLang,
      options: [{
        value: 'de',
        label: 'Deutsch'
      }, {
        value: 'en',
        label: 'English'
      }, {
        value: 'fr',
        label: 'Français'
      }]
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Zeitzone"
    }, /*#__PURE__*/React.createElement(Select, {
      value: tz,
      onChange: setTz,
      options: [{
        value: 'Europe/Berlin',
        label: 'Berlin (MEZ)'
      }, {
        value: 'Europe/London',
        label: 'London (GMT)'
      }, {
        value: 'Europe/Zurich',
        label: 'Zürich (MEZ)'
      }, {
        value: 'America/New_York',
        label: 'New York (EST)'
      }, {
        value: 'Asia/Tokyo',
        label: 'Tokio (JST)'
      }]
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: T.muted,
        padding: '4px 4px 0'
      }
    }, "E-Mail-Benachrichtigungen"), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '2px 6px'
      }
    }, NOTES.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.k
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 16
    }) : null, /*#__PURE__*/React.createElement(ListItem, {
      title: r.l,
      subtitle: r.d,
      trailing: /*#__PURE__*/React.createElement(Switch, {
        checked: prefs[r.k],
        onChange: () => toggle(r.k),
        ariaLabel: r.l
      })
    })))), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "Profil gespeichert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }
  Object.assign(window.StridoScreens, {
    CreateGroup,
    GroupPreferences,
    Invite,
    Reports,
    Availability,
    Preferences
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff_ui_kit/design-references/screens3.jsx", error: String((e && e.message) || e) }); }

// handoff_ui_kit/design-references/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff_ui_kit/design-references/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// redesign/data.js
try { (() => {
// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: {
    name: 'Mia Halvorsen',
    initials: 'MH',
    role: 'Rider'
  },
  groups: [{
    id: 'g1',
    name: 'Nord Eventing Academy',
    initials: 'NE',
    members: 14
  }, {
    id: 'g2',
    name: 'Trail & Dressage Club',
    initials: 'TD',
    members: 9
  }],
  videos: [{
    id: 'v1',
    title: 'Combination line — take 2',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 3,
    duration: '0:48',
    desc: 'Two strides in, felt rushed to the oxer.'
  }, {
    id: 'v2',
    title: 'Sitting trot — long side',
    group: 'Trail & Dressage Club',
    gi: 'TD',
    status: 'completed',
    reviews: 6,
    duration: '1:22',
    desc: 'Working on a steadier contact.'
  }, {
    id: 'v3',
    title: 'Warm-up canter transitions',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 1,
    duration: '2:05',
    desc: 'Left lead pickup is sticky.'
  }, {
    id: 'v4',
    title: 'Grid work — bounce to one',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'waiting_upload',
    reviews: 0,
    duration: '0:36',
    desc: ''
  }],
  reviews: [{
    id: 'r1',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:12',
    when: '2h ago',
    body: 'Good rhythm on the approach — eyes up a stride earlier and the distance comes to you.'
  }, {
    id: 'r2',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:31',
    when: '2h ago',
    body: 'Here you tipped forward over the first element. Keep your shoulders back and let the horse close the gap.',
    replies: [{
      id: 'r2a',
      author: 'Mia Halvorsen',
      initials: 'MH',
      when: '1h ago',
      body: 'Makes sense — I felt the lean. Will drill it tomorrow.'
    }]
  }],
  bookings: [{
    id: 'b1',
    type: 'Video review session',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Tue 18 Jun · 16:00',
    mins: 30,
    status: 'pending',
    joinable: true
  }, {
    id: 'b2',
    type: 'Flatwork deep-dive',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Fri 21 Jun · 09:30',
    mins: 45,
    status: 'pending',
    joinable: false
  }, {
    id: 'b3',
    type: 'Jumping technique',
    who: 'Coach Lars',
    role: 'expert',
    when: 'Mon 10 Jun · 17:00',
    mins: 30,
    status: 'done',
    joinable: false,
    recording: 'ready'
  }, {
    id: 'b4',
    type: 'Course walk-through',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Thu 6 Jun · 14:00',
    mins: 30,
    status: 'cancelled',
    joinable: false,
    reason: 'Horse off work.'
  }],
  notifications: 2
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/data.js", error: String((e && e.message) || e) }); }

// redesign/material-home.jsx
try { (() => {
/* Strido — Material 3 home screen + Android device frame.
 * Material-native primitives that read per-frame --m-* theme tokens
 * (see material-themes.js). Exposes window.StridoMaterial.
 */
(function () {
  const D = window.StridoData;

  /* Lucide icon helper — renders an <i> that lucide.createIcons() swaps for an SVG. */
  function Icon({
    n,
    size = 20,
    color = 'currentColor',
    sw = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color,
        strokeWidth: sw,
        display: 'inline-flex',
        flexShrink: 0,
        ...style
      }
    });
  }

  /* ── Material state-layer pressable (ripple-ish hover) ─────────────────── */
  function Pressable({
    children,
    onClick,
    style,
    round,
    label
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      "aria-label": label,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        boxSizing: 'border-box',
        borderRadius: round ? 999 : 16,
        WebkitTapHighlightColor: 'transparent',
        ...style
      }
    }, children);
  }

  /* ── Android status bar ────────────────────────────────────────────────── */
  function StatusBar() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 34,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 22px',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '.01em'
      }
    }, "9:41"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "signal",
      size: 15,
      sw: 2.4
    }), /*#__PURE__*/React.createElement(Icon, {
      n: "wifi",
      size: 15,
      sw: 2.4
    }), /*#__PURE__*/React.createElement(Icon, {
      n: "battery-full",
      size: 20,
      sw: 2
    })));
  }

  /* ── Top app bar — personalised greeting (home) or plain title ─────────── */
  function TopBar({
    title,
    subtitle,
    avatar = true
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 14px'
      }
    }, avatar ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 999,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 800,
        flexShrink: 0
      }
    }, D.user.initials) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, subtitle ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--m-on-surface-variant)',
        lineHeight: 1.1
      }
    }, subtitle) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title)), /*#__PURE__*/React.createElement("button", {
      "aria-label": "Benachrichtigungen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--m-s2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 22,
      color: "var(--m-on-surface)",
      sw: 2
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        boxSizing: 'border-box',
        background: 'var(--m-primary)',
        color: 'var(--m-on-primary)',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        border: '2px solid var(--m-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, D.notifications) : null));
  }

  /* ── Hero — next session (filled primary-container card) ───────────────── */
  function HeroSession() {
    const b = D.bookings.find(x => x.status === 'pending') || D.bookings[0];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        padding: 18,
        borderRadius: 28,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        opacity: .9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "calendar-clock",
      size: 14,
      sw: 2.4
    }), "N\xE4chste Session"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: 'var(--m-surface)',
        color: 'var(--m-on-surface)'
      }
    }, "in 2 Tagen")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1.25
      }
    }, "Video-Review mit ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13.5,
        fontWeight: 600,
        opacity: .92
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 15,
      sw: 2.2
    }), b.when, " \xB7 ", b.mins, " Min"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 999,
        background: 'var(--m-primary)',
        color: 'var(--m-on-primary)',
        fontSize: 15,
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "video",
      size: 18,
      sw: 2.2
    }), "Beitreten"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        padding: '0 18px',
        borderRadius: 999,
        border: '1.5px solid currentColor',
        fontSize: 15,
        fontWeight: 700,
        opacity: .9
      }
    }, "Details")));
  }

  /* ── Section header ────────────────────────────────────────────────────── */
  function SectionHeader({
    title,
    action,
    onAction
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), action ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--m-primary)'
      }
    }, action) : null);
  }

  /* ── Video list item (filled tile) ─────────────────────────────────────── */
  function VideoItem({
    v
  }) {
    const done = v.status === 'completed';
    const chipBg = done ? 'var(--m-success-container)' : 'var(--m-secondary-container)';
    const chipFg = done ? 'var(--m-on-success-container)' : 'var(--m-on-secondary-container)';
    const chipLabel = done ? 'Geprüft' : 'In Prüfung';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: 10,
        borderRadius: 20,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 92,
        height: 62,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 22,
      color: "rgba(255,255,255,.92)",
      sw: 2.2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.55)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--m-on-surface)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--m-on-surface-variant)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: chipBg,
        color: chipFg
      }
    }, chipLabel), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: "var(--m-on-surface-variant)"
    }), v.reviews))));
  }

  /* ── First-steps progress card ─────────────────────────────────────────── */
  const STEPS = [{
    done: true,
    label: 'Gruppe erstellt',
    desc: 'Deine erste Gruppe ist bereit für Schüler und Videos.'
  }, {
    done: false,
    label: 'Erstes Video hochladen',
    desc: 'Teile ein Trainingsvideo, damit ein Experte es überprüfen kann.'
  }, {
    done: false,
    label: 'Eingereichte Videos überprüfen',
    desc: 'Videos von Schülern, die auf Feedback warten, erscheinen hier.'
  }, {
    done: false,
    label: 'Coaching-Verfügbarkeit festlegen',
    desc: 'Erstelle Terminarten und Verfügbarkeiten, damit Schüler buchen können.'
  }];
  function StepItem({
    s,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: last ? 'none' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        flexShrink: 0,
        marginTop: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: s.done ? 'var(--m-primary)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--m-outline)'
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 14,
      color: "var(--m-on-primary)",
      sw: 3
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: s.done ? 'var(--m-on-surface-variant)' : 'var(--m-on-surface)'
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--m-on-surface-variant)',
        marginTop: 2
      }
    }, s.desc)), !s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 18,
      color: "var(--m-on-surface-variant)",
      style: {
        marginTop: 3
      }
    }) : null);
  }
  function StepsCard() {
    const doneN = STEPS.filter(s => s.done).length;
    const pct = Math.round(doneN / STEPS.length * 100);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        padding: '16px 18px',
        borderRadius: 24,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: 'var(--m-on-surface)',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, "Erste Schritte"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, doneN, "/", STEPS.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        height: 6,
        borderRadius: 999,
        background: 'var(--m-outline-variant)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        borderRadius: 999,
        background: 'var(--m-primary)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        borderTop: i ? '1px solid var(--m-outline-variant)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(StepItem, {
      s: s
    })))));
  }

  /* ── Extended FAB — primary action: upload ─────────────────────────────── */
  function Fab() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 16,
        bottom: 88,
        zIndex: 30
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 56,
        padding: '0 20px',
        borderRadius: 18,
        background: 'var(--m-primary-container)',
        color: 'var(--m-on-primary-container)',
        fontSize: 15,
        fontWeight: 800,
        boxShadow: '0 6px 16px -4px var(--m-shadow), 0 2px 6px -2px var(--m-shadow)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "upload",
      size: 20,
      sw: 2.2
    }), "Hochladen"));
  }

  /* ── Material navigation bar ───────────────────────────────────────────── */
  const NAV = [{
    id: 'home',
    label: 'Home',
    icon: 'house'
  }, {
    id: 'videos',
    label: 'Videos',
    icon: 'video'
  }, {
    id: 'sessions',
    label: 'Sessions',
    icon: 'calendar-clock'
  }, {
    id: 'groups',
    label: 'Gruppen',
    icon: 'users'
  }, {
    id: 'profile',
    label: 'Profil',
    icon: 'user-round'
  }];
  function NavBar({
    active = 'home'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        display: 'flex',
        background: 'var(--m-nav)',
        paddingBottom: 12,
        paddingTop: 10
      }
    }, NAV.map(t => {
      const on = t.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: t.id,
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 56,
          height: 30,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: on ? 'var(--m-secondary-container)' : 'transparent'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: t.icon,
        size: 22,
        sw: on ? 2.4 : 2,
        color: on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)'
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11.5,
          fontWeight: on ? 800 : 600,
          color: on ? 'var(--m-on-surface)' : 'var(--m-on-surface-variant)'
        }
      }, t.label));
    }));
  }

  /* ── Composed Material home ────────────────────────────────────────────── */
  function MaterialHome() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--m-bg)',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement(TopBar, {
      title: D.user.name.split(' ')[0],
      subtitle: "Guten Morgen"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        paddingBottom: 116
      },
      className: "m-scroll"
    }, /*#__PURE__*/React.createElement(HeroSession, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px'
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Deine Videos",
      action: "Alle ansehen"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, D.videos.slice(0, 2).map(v => /*#__PURE__*/React.createElement(VideoItem, {
      key: v.id,
      v: v
    })))), /*#__PURE__*/React.createElement(StepsCard, null)), /*#__PURE__*/React.createElement(Fab, null), /*#__PURE__*/React.createElement(NavBar, {
      active: "home"
    }));
  }

  /* ── Android device frame ──────────────────────────────────────────────── */
  function PhoneFrame({
    theme,
    screen
  }) {
    const t = window.MThemes[theme];
    const cssVars = {
      ...t.vars
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...cssVars,
        width: 360,
        height: 760,
        position: 'relative',
        flexShrink: 0,
        background: 'var(--m-bg)',
        borderRadius: 40,
        overflow: 'hidden',
        boxShadow: t.dark ? '0 0 0 2px #000, 0 0 0 11px #1c1c1f, 0 30px 60px -22px rgba(0,0,0,.7)' : '0 0 0 2px #2a2320, 0 0 0 11px #3a3330, 0 30px 60px -22px rgba(40,24,15,.45)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans), system-ui, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 11,
        height: 11,
        borderRadius: 999,
        background: '#000',
        zIndex: 60,
        opacity: .85
      }
    }), /*#__PURE__*/React.createElement(StatusBar, null), screen || /*#__PURE__*/React.createElement(MaterialHome, null));
  }
  window.StridoMaterial = {
    PhoneFrame,
    MaterialHome,
    Icon,
    StatusBar,
    TopBar,
    NavBar,
    Fab,
    SectionHeader,
    VideoItem
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/material-home.jsx", error: String((e && e.message) || e) }); }

// redesign/material-themes.js
try { (() => {
/* Strido — Material 3 / Material You token sets for the Android home redesign.
 * Four schemes: ember-orange (brand) and a neutral native-Material indigo,
 * each in light & dark. Each entry maps the --m-* role tokens consumed by
 * material-home.jsx. Plain script: assigns window.MThemes.
 */
window.MThemes = {
  /* ── Ember orange — derived Material tonal palette from Strido #ea580c ── */
  'orange-light': {
    label: 'Orange',
    sub: 'Light · brand ember',
    dark: false,
    vars: {
      '--m-bg': '#fff8f4',
      '--m-surface': '#fff8f4',
      '--m-s1': '#fdf1ea',
      '--m-s2': '#faece2',
      '--m-s3': '#f5e6db',
      '--m-s4': '#efe0d4',
      '--m-on-surface': '#221a15',
      '--m-on-surface-variant': '#54443b',
      '--m-outline': '#897668',
      '--m-outline-variant': '#d8c3b6',
      '--m-primary': '#bd4309',
      '--m-on-primary': '#ffffff',
      '--m-primary-container': '#ffdbc8',
      '--m-on-primary-container': '#3a1400',
      '--m-secondary-container': '#ffdcc4',
      '--m-on-secondary-container': '#5a3214',
      '--m-success': '#15803d',
      '--m-success-container': '#c7f1d2',
      '--m-on-success-container': '#05351a',
      '--m-nav': '#faece2',
      '--m-shadow': 'rgba(73,38,12,.20)'
    }
  },
  'orange-dark': {
    label: 'Orange',
    sub: 'Dark · brand ember',
    dark: true,
    vars: {
      '--m-bg': '#18120d',
      '--m-surface': '#18120d',
      '--m-s1': '#1f160f',
      '--m-s2': '#261c14',
      '--m-s3': '#31271d',
      '--m-s4': '#3c3026',
      '--m-on-surface': '#f2dfd2',
      '--m-on-surface-variant': '#d8c3b6',
      '--m-outline': '#a18d80',
      '--m-outline-variant': '#54443b',
      '--m-primary': '#ffb68f',
      '--m-on-primary': '#522300',
      '--m-primary-container': '#7c3500',
      '--m-on-primary-container': '#ffdbc8',
      '--m-secondary-container': '#5d4030',
      '--m-on-secondary-container': '#ffdcc4',
      '--m-success': '#7fd99a',
      '--m-success-container': '#1f4a30',
      '--m-on-success-container': '#c7f1d2',
      '--m-nav': '#211913',
      '--m-shadow': 'rgba(0,0,0,.45)'
    }
  },
  /* ── Neutral — native-Material indigo on cool greys ───────────────────── */
  'neutral-light': {
    label: 'Neutral',
    sub: 'Light · indigo accent',
    dark: false,
    vars: {
      '--m-bg': '#fbf8ff',
      '--m-surface': '#fbf8ff',
      '--m-s1': '#f3f2fb',
      '--m-s2': '#edecf5',
      '--m-s3': '#e7e6ef',
      '--m-s4': '#e1e0e9',
      '--m-on-surface': '#1b1b21',
      '--m-on-surface-variant': '#45464f',
      '--m-outline': '#76767f',
      '--m-outline-variant': '#c6c5d0',
      '--m-primary': '#4a5bd0',
      '--m-on-primary': '#ffffff',
      '--m-primary-container': '#dfe0ff',
      '--m-on-primary-container': '#001257',
      '--m-secondary-container': '#e1e0f9',
      '--m-on-secondary-container': '#191a2c',
      '--m-success': '#2e6c43',
      '--m-success-container': '#b2f1c2',
      '--m-on-success-container': '#00210f',
      '--m-nav': '#edecf5',
      '--m-shadow': 'rgba(20,22,40,.18)'
    }
  },
  'neutral-dark': {
    label: 'Neutral',
    sub: 'Dark · indigo accent',
    dark: true,
    vars: {
      '--m-bg': '#121318',
      '--m-surface': '#121318',
      '--m-s1': '#1b1b21',
      '--m-s2': '#1f2026',
      '--m-s3': '#2a2a31',
      '--m-s4': '#34343b',
      '--m-on-surface': '#e4e1e9',
      '--m-on-surface-variant': '#c6c5d0',
      '--m-outline': '#90909a',
      '--m-outline-variant': '#45464f',
      '--m-primary': '#bdc2ff',
      '--m-on-primary': '#1a2678',
      '--m-primary-container': '#323f8f',
      '--m-on-primary-container': '#dfe0ff',
      '--m-secondary-container': '#43444f',
      '--m-on-secondary-container': '#e1e0f9',
      '--m-success': '#94d5a4',
      '--m-success-container': '#14512a',
      '--m-on-success-container': '#b2f1c2',
      '--m-nav': '#1f2026',
      '--m-shadow': 'rgba(0,0,0,.5)'
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/material-themes.js", error: String((e && e.message) || e) }); }

// redesign/videos-home.jsx
try { (() => {
/* Strido — Material 3 "Videos" screen (orange light + dark).
 * Reuses shared primitives from window.StridoMaterial. Exposes window.StridoVideos.
 */
(function () {
  const D = window.StridoData;
  const M = window.StridoMaterial;
  const {
    Icon,
    TopBar,
    NavBar,
    Fab
  } = M;

  /* status → Material chip tones (reads --m-* tokens) */
  function statusChip(status) {
    if (status === 'completed') return {
      bg: 'var(--m-success-container)',
      fg: 'var(--m-on-success-container)',
      label: 'Geprüft',
      icon: 'check-circle-2'
    };
    if (status === 'pending') return {
      bg: 'var(--m-secondary-container)',
      fg: 'var(--m-on-secondary-container)',
      label: 'In Prüfung',
      icon: 'loader'
    };
    return {
      bg: 'var(--m-s3)',
      fg: 'var(--m-on-surface-variant)',
      label: 'Lädt hoch',
      icon: 'upload-cloud'
    };
  }

  /* ── Filter — Material 3 segmented button (full width) ──────────────────── */
  function SegmentedFilter({
    active
  }) {
    const reviewed = D.videos.filter(v => v.status === 'completed').length;
    const segs = [{
      id: 'all',
      label: 'Alle'
    }, {
      id: 'toReview',
      label: 'Zu prüfen'
    }, {
      id: 'reviewed',
      label: 'Geprüft'
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '0 16px',
        display: 'flex',
        height: 42,
        borderRadius: 999,
        border: '1.4px solid var(--m-outline)',
        overflow: 'hidden'
      }
    }, segs.map((s, i) => {
      const on = s.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          background: on ? 'var(--m-secondary-container)' : 'transparent',
          color: on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)',
          borderLeft: i ? '1.4px solid var(--m-outline)' : 'none',
          fontSize: 13.5,
          fontWeight: 700
        }
      }, on ? /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 15,
        sw: 2.8,
        color: "var(--m-on-secondary-container)"
      }) : null, /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap'
        }
      }, s.label));
    }));
  }

  /* ── Video card (richer than the home tile) ────────────────────────────── */
  function VideoCard({
    v
  }) {
    const s = statusChip(v.status);
    const uploading = v.status === 'waiting_upload';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 12,
        borderRadius: 22,
        background: 'var(--m-s1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 104,
        height: 70,
        borderRadius: 16,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, uploading ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 22,
      color: "rgba(255,255,255,.9)",
      sw: 2.2
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 999,
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 17,
      color: "#fff",
      sw: 2.4,
      style: {
        marginLeft: 2
      }
    })), !uploading ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.6)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--m-on-surface)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: 'var(--m-on-surface-variant)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 9px 3px 7px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: s.bg,
        color: s.fg
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: s.icon,
      size: 13,
      color: s.fg,
      sw: 2.4
    }), s.label), v.reviews ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: "var(--m-on-surface-variant)"
    }), v.reviews) : null)));
  }

  /* ── Composed Videos screen ────────────────────────────────────────────── */
  function MaterialVideos() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--m-bg)',
        color: 'var(--m-on-surface)'
      }
    }, /*#__PURE__*/React.createElement(TopBar, {
      title: "Videos",
      avatar: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingBottom: 116
      },
      className: "m-scroll"
    }, /*#__PURE__*/React.createElement(SegmentedFilter, {
      active: "all"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px 2px',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--m-on-surface-variant)',
        letterSpacing: '.04em',
        textTransform: 'uppercase'
      }
    }, D.videos.length, " Videos"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, D.videos.map(v => /*#__PURE__*/React.createElement(VideoCard, {
      key: v.id,
      v: v
    })))), /*#__PURE__*/React.createElement(Fab, null), /*#__PURE__*/React.createElement(NavBar, {
      active: "videos"
    }));
  }
  window.StridoVideos = {
    MaterialVideos,
    VideoCard
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/videos-home.jsx", error: String((e && e.message) || e) }); }

// screens.jsx
try { (() => {
/* Strido mobile UI kit — screens (Material You).
 * Composes the design-system primitives from window.StridoDesignSystem_dc14ef.
 * Exposes window.StridoScreens, consumed by index.html.
 * German copy, matching the approved Home/Videos redesign.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;

  /* Platform switch (driven by the Tweaks panel via setPlatform). The wrapped DS
     components auto-inject the current platform, so every screen renders the
     Material or the iOS variant from one source. Components with no native iOS
     divergence (Fab, Badge, Avatar, EmptyState, IconTile) are used unwrapped. */
  let PLATFORM = 'material';
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  function setPlatform(p) {
    PLATFORM = p === 'ios' ? 'ios' : 'material';
    PlatformState.current = PLATFORM;
  }
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button);
  const IconButton = _w(DS.IconButton);
  const Card = _w(DS.Card);
  const Chip = _w(DS.Chip);
  const SegmentedButton = _w(DS.SegmentedButton);
  const Stepper = _w(DS.Stepper);
  const ProgressBar = _w(DS.ProgressBar);
  const Textarea = _w(DS.Textarea);
  const ListItem = _w(DS.ListItem);
  const Switch = _w(DS.Switch);
  const Divider = _w(DS.Divider);
  const {
    Fab,
    Badge,
    Avatar,
    EmptyState,
    IconTile,
    LargeTitleBar
  } = DS;
  const D = window.StridoData;

  /* Lucide icon helper — renders an <i> Lucide replaces with an SVG after mount. */
  function Icon({
    n,
    size = 20,
    color = 'currentColor',
    sw = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color,
        strokeWidth: sw,
        display: 'inline-flex',
        flexShrink: 0,
        ...style
      }
    });
  }
  const T = {
    strong: 'var(--role-on-surface)',
    muted: 'var(--role-on-surface-variant)',
    primary: 'var(--role-accent)',
    primaryStrong: 'var(--role-accent-strong)',
    bg: 'var(--role-background)'
  };

  /* Tiny nav bus so leaf components (e.g. the header bell) can push screens
     without threading the go() callback through every screen. App registers go(). */
  let _nav = null;
  function setNav(fn) {
    _nav = fn;
  }
  function navTo(action) {
    if (_nav) _nav(action);
  }

  /* German labels for the English sample data ------------------------------- */
  const TYPE_DE = {
    'Video review session': 'Video-Review',
    'Flatwork deep-dive': 'Dressur-Deep-Dive',
    'Jumping technique': 'Spring-Technik',
    'Course walk-through': 'Parcours-Begehung'
  };
  const VIDEO_DE = {
    'Combination line — take 2': 'Kombination — Versuch 2',
    'Sitting trot — long side': 'Aussitzen im Trab — lange Seite',
    'Warm-up canter transitions': 'Galopp-Übergänge im Warm-up',
    'Grid work — bounce to one': 'Gymnastikreihe — Bounce'
  };
  const dt = s => TYPE_DE[s] || s;
  const dv = s => VIDEO_DE[s] || s;
  function videoStatus(status) {
    if (status === 'completed') return {
      tone: 'success',
      label: 'Geprüft',
      icon: 'check-circle-2'
    };
    if (status === 'pending') return {
      tone: 'primary',
      label: 'In Prüfung',
      icon: 'clock'
    };
    return {
      tone: 'neutral',
      label: 'Lädt hoch',
      icon: 'upload-cloud'
    };
  }

  /* ── Shared screen shell: fixed header + scroll area ────────────────────── */
  function Screen({
    header,
    children,
    pad = 16,
    gap = 22,
    bottom = 116
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `0 0 ${bottom}px`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px 0`
      }
    }, children)));
  }

  /* Plain title top app bar (Videos / Sessions / Groups / Profile). */
  /* Plain title top app bar (Material) / large-title nav bar (iOS). `action` is
     the screen's primary action — on iOS it surfaces as a nav-bar button (iOS has
     no FAB); on Material it's null (the FAB in index.html handles it). */
  function bellNode() {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 23,
      color: "var(--role-accent)"
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -1,
        right: -1,
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--role-danger)',
        border: '1.5px solid var(--role-background)'
      }
    }) : null);
  }
  function TopBar({
    title,
    action
  }) {
    if (isIOS()) {
      const actions = [];
      if (action) actions.push({
        id: 'primary',
        label: action.label,
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: action.icon,
          size: 26,
          color: "var(--role-accent)"
        }),
        onPress: action.onPress
      });
      actions.push({
        id: 'bell',
        label: 'Benachrichtigungen',
        icon: bellNode(),
        onPress: () => navTo({
          push: {
            screen: 'notifications'
          }
        })
      });
      return /*#__PURE__*/React.createElement(LargeTitleBar, {
        platform: "ios",
        title: title,
        actions: actions
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: T.strong,
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement(Bell, null));
  }
  function Bell() {
    return /*#__PURE__*/React.createElement("button", {
      "aria-label": "Benachrichtigungen",
      onClick: () => navTo({
        push: {
          screen: 'notifications'
        }
      }),
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 22,
      color: T.strong
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        boxSizing: 'border-box',
        background: 'var(--role-accent)',
        color: 'var(--role-on-accent)',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        border: '2px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, D.notifications) : null);
  }
  function SectionHeader({
    title,
    action,
    onAction
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), action ? /*#__PURE__*/React.createElement("button", {
      onClick: onAction,
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, action) : null);
  }

  /* ── Reusable nav header for pushed screens ─────────────────────────────── */
  function NavHeader({
    title,
    onBack,
    right
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minHeight: 44,
          padding: '6px 10px',
          background: T.bg
        }
      }, onBack ? /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        "aria-label": "Zur\xFCck",
        style: {
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          color: 'var(--role-accent)',
          zIndex: 1
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-left",
        size: 27,
        color: "var(--role-accent)",
        sw: 2.4
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 17,
          letterSpacing: '-0.01em'
        }
      }, "Zur\xFCck")) : /*#__PURE__*/React.createElement("div", {
        style: {
          width: 8
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none'
        }
      }, title), /*#__PURE__*/React.createElement("div", {
        style: {
          marginLeft: 'auto',
          zIndex: 1
        }
      }, right));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 8px 8px 4px',
        background: T.bg
      }
    }, onBack ? /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Zur\xFCck",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "arrow-left",
      size: 24,
      color: T.strong
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), right);
  }

  /* ── Video tile (Material filled) ───────────────────────────────────────── */
  function VideoTile({
    v,
    onClick
  }) {
    const s = videoStatus(v.status);
    const uploading = v.status === 'waiting_upload';
    const ios = isIOS();
    const tileStyle = ios ? {
      borderRadius: 14,
      background: 'var(--role-surface)',
      boxShadow: '0 1px 3px rgba(38,24,15,0.05), 0 8px 22px -10px rgba(38,24,15,0.13), 0 0 0 0.5px rgba(38,24,15,0.05)'
    } : {
      borderRadius: 'var(--radius-tile)',
      background: 'var(--role-surface-1)'
    };
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 11,
        ...tileStyle
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 100,
        height: 66,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, uploading ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 999,
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 16,
      color: "#fff",
      sw: 2.4,
      style: {
        marginLeft: 2
      }
    })), !uploading ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.6)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, dv(v.title)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), v.reviews ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: T.muted
    }), v.reviews) : null)));
  }

  /* ── Login ──────────────────────────────────────────────────────────────── */
  function Login({
    onSignIn
  }) {
    const [busy, setBusy] = React.useState(false);
    function go() {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        onSignIn();
      }, 700);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: T.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 4,
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'var(--role-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 32,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, "S")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em'
      }
    }, "Strido"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: T.muted
      }
    }, "Video-Coaching f\xFCr Reiter")), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: 20,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Willkommen zur\xFCck"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '8px 0 0',
        fontSize: 14,
        lineHeight: 1.6,
        color: T.muted
      }
    }, "Lade Reitvideos hoch und erhalte sekundengenaues Feedback \u2014 oder geh live, eins zu eins."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Anmelden",
      loading: busy,
      onClick: go,
      style: {
        width: '100%'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Konto erstellen",
      variant: "tonal",
      onClick: go,
      style: {
        width: '100%'
      }
    })))));
  }

  /* ── Home ───────────────────────────────────────────────────────────────── */
  function GreetingBar() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 999,
        background: 'var(--role-accent-container)',
        color: 'var(--role-on-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 800,
        flexShrink: 0
      }
    }, D.user.initials), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: T.muted,
        lineHeight: 1.1
      }
    }, "Guten Morgen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, D.user.name.split(' ')[0])), /*#__PURE__*/React.createElement(Bell, null));
  }
  function HeroSession({
    go
  }) {
    const b = D.bookings.find(x => x.status === 'pending') || D.bookings[0];
    return /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      padding: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        opacity: .9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "calendar-clock",
      size: 14,
      sw: 2.4
    }), "N\xE4chste Session"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: 'var(--role-surface)',
        color: T.strong
      }
    }, "in 5 Minuten")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1.25
      }
    }, dt(b.type), " mit ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13.5,
        fontWeight: 600,
        opacity: .92
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 15,
      sw: 2.2
    }), b.when, " \xB7 ", b.mins, " Min"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 18,
        color: "currentColor"
      }),
      onClick: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      }),
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Details",
      variant: "secondary",
      onClick: () => go({
        tab: 'sessions'
      }),
      style: {
        background: 'transparent',
        borderColor: 'currentColor',
        color: 'inherit'
      }
    })));
  }
  const STEPS = [{
    done: true,
    label: 'Gruppe beigetreten',
    desc: 'Du kannst in deiner Gruppe Videos hochladen und Coaching buchen.'
  }, {
    done: false,
    label: 'Erstes Video hochladen',
    desc: 'Teile ein Trainingsvideo, damit ein Experte es prüfen kann.'
  }, {
    done: false,
    label: 'Live-Coaching buchen',
    desc: 'Reserviere einen Termin, wenn dein Experte verfügbar ist.'
  }];
  function StepRow({
    s
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        flexShrink: 0,
        marginTop: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: s.done ? 'var(--role-accent)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--role-outline)'
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 14,
      color: "var(--role-on-accent)",
      sw: 3
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: s.done ? T.muted : T.strong
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        color: T.muted,
        marginTop: 2
      }
    }, s.desc)), !s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 18,
      color: T.muted,
      style: {
        marginTop: 3
      }
    }) : null);
  }
  function StepsCard() {
    const done = STEPS.filter(s => s.done).length;
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '16px 18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, "Erste Schritte"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.muted
      }
    }, done, "/", STEPS.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: done,
      max: STEPS.length
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        borderTop: i ? '1px solid var(--role-outline)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(StepRow, {
      s: s
    })))));
  }
  function Home({
    go
  }) {
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(GreetingBar, null)
    }, /*#__PURE__*/React.createElement(HeroSession, {
      go: go
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Deine Videos",
      action: "Alle ansehen",
      onAction: () => go({
        tab: 'videos'
      })
    }), D.videos.slice(0, 2).map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))), /*#__PURE__*/React.createElement(StepsCard, null));
  }

  /* ── Videos ─────────────────────────────────────────────────────────────── */
  function Videos({
    go,
    primaryAction
  }) {
    const [filter, setFilter] = React.useState('all');
    const reviewed = D.videos.filter(v => v.status === 'completed').length;
    const list = filter === 'all' ? D.videos : filter === 'reviewed' ? D.videos.filter(v => v.status === 'completed') : D.videos.filter(v => v.status !== 'completed');
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Videos",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: filter,
      onChange: setFilter,
      segments: [{
        id: 'all',
        label: 'Alle'
      }, {
        id: 'toReview',
        label: 'Zu prüfen'
      }, {
        id: 'reviewed',
        label: 'Geprüft'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        padding: '0 4px'
      }
    }, list.length, " Videos"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, list.map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))));
  }

  /* ── Asset detail ───────────────────────────────────────────────────────── */
  function ReviewBlock({
    r,
    isReply
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: r.initials,
      alt: r.author,
      size: isReply ? 28 : 36,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.strong
      }
    }, r.author), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        fontSize: 14,
        lineHeight: 1.55,
        color: T.strong
      }
    }, r.body), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, r.ts ? /*#__PURE__*/React.createElement(Chip, {
      label: r.ts,
      showCheck: false
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, r.when), !isReply ? /*#__PURE__*/React.createElement("button", {
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "reply",
      size: 14,
      color: T.muted
    }), " Antworten") : null)));
  }
  function AssetDetail({
    id,
    onBack
  }) {
    const v = D.videos.find(x => x.id === id) || D.videos[0];
    const [draft, setDraft] = React.useState('');
    const s = videoStatus(v.status);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: dv(v.title),
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: 'linear-gradient(135deg,#3a2417,#1a0f08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 26,
      color: "#fff",
      sw: 2.2,
      style: {
        marginLeft: 3
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#fff'
      }
    }, "0:12"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: 0.28,
      height: 4
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'rgba(255,255,255,.7)'
      }
    }, v.duration))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, dv(v.title)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: v.gi,
      alt: v.group,
      size: 32
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, v.group)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.5
      }
    }, v.desc || 'Für dieses Video wurde keine Beschreibung hinzugefügt.')), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 18,
      color: T.primaryStrong
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong
      }
    }, "Kommentare"), /*#__PURE__*/React.createElement(Badge, {
      label: D.reviews.length
    })), D.reviews.map(r => /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: r
    }), (r.replies || []).map(rr => /*#__PURE__*/React.createElement("div", {
      key: rr.id,
      style: {
        paddingLeft: 22
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: rr,
      isReply: true
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: draft,
      onChange: setDraft,
      rows: 2,
      placeholder: "Kommentar hinzuf\xFCgen\u2026"
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verbessern",
      variant: "tonal",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "sparkles",
      size: 16,
      color: "var(--role-on-secondary-container)"
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Senden",
      variant: "primary",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "send",
      size: 16,
      color: "currentColor"
    })))))));
  }

  /* ── Sessions ───────────────────────────────────────────────────────────── */
  function bookingStatus(status) {
    if (status === 'cancelled') return {
      tone: 'danger',
      label: 'Storniert'
    };
    if (status === 'done') return {
      tone: 'neutral',
      label: 'Erledigt'
    };
    return {
      tone: 'primary',
      label: 'Anstehend'
    };
  }
  function BookingCard({
    b,
    onJoin
  }) {
    const s = bookingStatus(b.status);
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, dt(b.type)), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), b.recording === 'ready' ? /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      label: "Aufnahme bereit"
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.muted
      }
    }, "Experte: ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13.5,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 14,
      color: T.muted
    }), b.when, " \xB7 ", b.mins, " Min"), b.reason ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--role-danger)'
      }
    }, "Grund: ", b.reason) : null, b.joinable || b.recording === 'ready' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        gap: 8
      }
    }, b.joinable ? /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 16,
        color: "currentColor"
      }),
      onClick: onJoin
    }) : null, b.recording === 'ready' ? /*#__PURE__*/React.createElement(Button, {
      label: "Aufnahme ansehen",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "play",
        size: 16,
        color: "var(--role-on-secondary-container)"
      })
    }) : null) : null);
  }
  function Sessions({
    go,
    primaryAction
  }) {
    const [tab, setTab] = React.useState('upcoming');
    const upcoming = D.bookings.filter(b => b.status === 'pending');
    const past = D.bookings.filter(b => b.status === 'done');
    const cancelled = D.bookings.filter(b => b.status === 'cancelled');
    const list = tab === 'past' ? past : tab === 'cancelled' ? cancelled : upcoming;
    const empty = {
      upcoming: 'anstehenden',
      past: 'vergangenen',
      cancelled: 'stornierten'
    }[tab];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Sessions",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: tab,
      onChange: setTab,
      segments: [{
        id: 'upcoming',
        label: 'Anstehend'
      }, {
        id: 'past',
        label: 'Vergangen'
      }, {
        id: 'cancelled',
        label: 'Storniert'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, list.length ? list.map(b => /*#__PURE__*/React.createElement(BookingCard, {
      key: b.id,
      b: b,
      onJoin: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      })
    })) : /*#__PURE__*/React.createElement(EmptyState, {
      title: `Keine ${empty} Sessions`,
      description: "Deine Sessions erscheinen hier.",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "calendar-clock",
        size: 24,
        color: T.primary
      })
    })));
  }

  /* ── Call ───────────────────────────────────────────────────────────────── */
  function Call({
    id,
    onLeave
  }) {
    const b = D.bookings.find(x => x.id === id) || D.bookings[0];
    const [mic, setMic] = React.useState(true);
    const [cam, setCam] = React.useState(true);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        background: '#0c0704',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: 'radial-gradient(120% 80% at 50% 35%, #3a2417, #0c0704)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: "CP",
      alt: b.who,
      size: 84,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: 700,
        color: '#fff'
      }
    }, b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        fontSize: 13,
        color: 'rgba(255,255,255,.6)'
      }
    }, "Warte auf den anderen Teilnehmer\u2026"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 14,
        top: 14,
        width: 84,
        height: 116,
        borderRadius: 16,
        overflow: 'hidden',
        background: cam ? 'linear-gradient(135deg,#5a3a22,#26180f)' : '#1a0f08',
        border: '1px solid rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, !cam ? /*#__PURE__*/React.createElement(Icon, {
      n: "video-off",
      size: 22,
      color: "rgba(255,255,255,.5)"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: '#fff'
      }
    }, "Du")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        padding: '18px 0 28px'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Mikrofon",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setMic(!mic)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: mic ? 'mic' : 'mic-off',
      size: 22,
      color: mic ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setCam(!cam)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: cam ? 'video' : 'video-off',
      size: 22,
      color: cam ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera wechseln",
      variant: "secondary",
      size: "lg",
      shape: "circle"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "switch-camera",
      size: 22,
      color: T.strong
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verlassen",
      variant: "primary",
      size: "lg",
      shape: "circle",
      onClick: onLeave,
      style: {
        background: 'var(--role-danger)',
        border: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "phone-off",
      size: 22,
      color: "#fff"
    }))));
  }

  /* ── Groups ─────────────────────────────────────────────────────────────── */
  /* iOS inset-grouped list: a white card with hairline separators between rows.
     On Material it preserves each screen's existing look (a filled card, or a
     plain gap-stacked list when materialWrap=false). */
  function GroupedRows({
    items,
    inset = 60,
    materialWrap = true
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement(Card, {
        padding: 0,
        style: {
          overflow: 'hidden'
        }
      }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, i ? /*#__PURE__*/React.createElement(Divider, {
        inset: inset
      }) : null, it)));
    }
    if (materialWrap) return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '6px 8px'
      }
    }, items);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, items);
  }
  function Groups({
    go
  }) {
    const items = D.groups.map(g => /*#__PURE__*/React.createElement(ListItem, {
      key: g.id,
      onClick: () => go({
        push: {
          screen: 'group',
          id: g.id
        }
      }),
      leading: /*#__PURE__*/React.createElement(Avatar, {
        fallback: g.initials,
        alt: g.name,
        size: 44
      }),
      title: g.name,
      subtitle: `${g.members} Mitglieder`,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    }));
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Gruppen"
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 73,
      materialWrap: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe beitreten",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "qr-code",
        size: 16,
        color: "var(--role-on-secondary-container)"
      }),
      onClick: () => navTo({
        push: {
          screen: 'invite'
        }
      }),
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe erstellen",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "plus",
        size: 16,
        color: T.strong,
        sw: 2.4
      }),
      onClick: () => navTo({
        push: {
          screen: 'createGroup'
        }
      }),
      style: {
        width: '100%'
      }
    })));
  }

  /* ── Profile ────────────────────────────────────────────────────────────── */
  function Profile({
    onSignOut
  }) {
    const [notify, setNotify] = React.useState(true);
    const rows = [{
      i: 'user-round',
      l: 'Persönliche Daten'
    }, {
      i: 'bar-chart-3',
      l: 'Berichte',
      a: {
        push: {
          screen: 'reports'
        }
      }
    }, {
      i: 'calendar-cog',
      l: 'Verfügbarkeit verwalten',
      a: {
        push: {
          screen: 'availability'
        }
      }
    }];
    const items = [...rows.map(r => /*#__PURE__*/React.createElement(ListItem, {
      key: r.l,
      onClick: () => r.a && navTo(r.a),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: r.i,
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: r.l,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    })), /*#__PURE__*/React.createElement(ListItem, {
      key: "notify",
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "mail",
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: "E-Mail-Benachrichtigungen",
      trailing: /*#__PURE__*/React.createElement(Switch, {
        checked: notify,
        onChange: setNotify,
        ariaLabel: "E-Mail-Benachrichtigungen"
      })
    })];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Profil"
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: D.user.initials,
      alt: D.user.name,
      size: 56,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.01em'
      }
    }, D.user.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        opacity: .9
      }
    }, "Reiterin \xB7 Nord Eventing Academy"))), /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 58
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Abmelden",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "log-out",
        size: 16,
        color: T.strong
      }),
      onClick: onSignOut,
      style: {
        width: '100%'
      }
    }));
  }
  window.StridoScreens = {
    Login,
    Home,
    Videos,
    AssetDetail,
    Sessions,
    Call,
    Groups,
    Profile,
    Icon,
    NavHeader,
    Screen,
    TopBar,
    SectionHeader,
    Bell,
    videoStatus,
    T,
    setNav,
    navTo,
    setPlatform
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens.jsx", error: String((e && e.message) || e) }); }

// screens3.jsx
try { (() => {
/* Strido mobile UI kit — secondary screens, part 3 (Material You ↔ iOS).
 * Adds the five flows the click-through was missing — each one wired to a
 * previously dead-end entry point:
 *   CreateGroup     ← Gruppen → „Gruppe erstellen“
 *   GroupPreferences ← GruppenDetail → Zahnrad
 *   Invite          ← Gruppen → „Gruppe beitreten“ (QR/Code)
 *   Reports         ← Profil → „Berichte“
 *   Availability    ← Profil → „Verfügbarkeit verwalten“
 * Reuses shared helpers (Icon, NavHeader, T) from screens.jsx.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button),
    IconButton = _w(DS.IconButton),
    Card = _w(DS.Card),
    Chip = _w(DS.Chip),
    Tabs = _w(DS.Tabs),
    TextInput = _w(DS.TextInput),
    Textarea = _w(DS.Textarea),
    Select = _w(DS.Select),
    ListItem = _w(DS.ListItem),
    Divider = _w(DS.Divider),
    Dialog = _w(DS.Dialog),
    Snackbar = _w(DS.Snackbar),
    FieldLabel = _w(DS.FieldLabel);
  const {
    FieldError,
    Badge,
    Avatar,
    EmptyState,
    IconTile
  } = DS;
  const D = window.StridoData;
  const S = window.StridoScreens;
  const {
    Icon,
    NavHeader,
    T
  } = S;

  /* Full-height pushed-screen shell: fixed nav header + scroll body. */
  function Sheet({
    header,
    children,
    pad = 16,
    gap = 16,
    bottom = 28
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px ${bottom}px`
      },
      "data-comment-anchor": "7a35839f71-div-31-9"
    }, children)));
  }
  function SecTitle({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, children);
  }
  function CancelBtn({
    onBack
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Abbrechen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: T.muted
      }
    }, "Abbrechen");
  }

  /* Round avatar picker (create / edit group). Tappable; toggles a filled state to
     stand in for a chosen image. Pflichtfeld — drives the parent's submit guard. */
  function AvatarInput({
    filled,
    onPick,
    initials = '',
    size = 88
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onPick,
      "aria-label": "Gruppenbild w\xE4hlen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: filled ? 'var(--role-accent-container)' : 'var(--role-surface-2)',
        border: filled ? 'none' : '1.5px dashed var(--role-outline)'
      }
    }, filled ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: size * 0.34,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, initials || 'NG') : /*#__PURE__*/React.createElement(Icon, {
      n: "camera",
      size: 26,
      color: T.muted,
      sw: 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--role-accent)',
        border: '2.5px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: filled ? 'pencil' : 'plus',
      size: 15,
      color: "var(--role-on-accent)",
      sw: 2.4
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, filled ? 'Bild ändern' : 'Gruppenbild (erforderlich)'));
  }

  /* Reusable labelled field wrapper. */
  function Field({
    label,
    hint,
    error,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(FieldLabel, null, label), children, error ? /*#__PURE__*/React.createElement(FieldError, null, error) : hint ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, hint) : null);
  }

  /* ── Create group ───────────────────────────────────────────────────────── */
  function CreateGroup({
    onBack
  }) {
    const [name, setName] = React.useState('');
    const [avatar, setAvatar] = React.useState(false);
    const [desc, setDesc] = React.useState('');
    const [touched, setTouched] = React.useState(false);
    const nameEmpty = name.trim().length === 0;
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    function submit() {
      setTouched(true);
      if (nameEmpty || !avatar) return;
      onBack();
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe erstellen",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: avatar,
      initials: initials,
      onPick: () => setAvatar(v => !v)
    })), touched && !avatar ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginTop: -8
      }
    }, /*#__PURE__*/React.createElement(FieldError, null, "Ein Gruppenbild ist erforderlich.")) : null, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name",
      error: touched && nameEmpty ? 'Bitte gib einen Namen ein.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "z. B. Nord Eventing Academy",
      invalid: touched && nameEmpty
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung",
      hint: "Optional \u2014 wof\xFCr ist diese Gruppe?"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe erstellen",
      disabled: nameEmpty || !avatar,
      onClick: submit,
      style: {
        width: '100%'
      }
    }));
  }

  /* ── Group preferences (edit + danger zone) ─────────────────────────────── */
  function GroupPreferences({
    id,
    onBack
  }) {
    const g = D.groups.find(x => x.id === id) || D.groups[0];
    const detail = D.groupMembers[g.id] || {
      desc: ''
    };
    const [name, setName] = React.useState(g.name);
    const [desc, setDesc] = React.useState(detail.desc || '');
    const [del, setDel] = React.useState(false);
    const [leave, setLeave] = React.useState(false);
    const [snack, setSnack] = React.useState(false);
    const dirty = name.trim() !== g.name || (desc || '') !== (detail.desc || '');
    const save = /*#__PURE__*/React.createElement("button", {
      onClick: () => dirty && setSnack(true),
      "aria-label": "Speichern",
      disabled: !dirty,
      style: {
        all: 'unset',
        cursor: dirty ? 'pointer' : 'default',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: dirty ? T.primaryStrong : T.muted
      }
    }, "Speichern");
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Einstellungen",
        onBack: onBack,
        right: save
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: true,
      initials: g.initials,
      onPick: () => {}
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "Gruppenname"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--role-danger)',
        padding: '4px 4px 0'
      }
    }, "Gefahrenzone"), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '4px 8px',
        border: '1px solid var(--role-danger-container)'
      }
    }, /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setLeave(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "log-out",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe verlassen"),
      subtitle: "Du verlierst den Zugriff auf Videos und Coaching."
    }), /*#__PURE__*/React.createElement(Divider, {
      inset: 58
    }), /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setDel(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "trash-2",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe l\xF6schen"),
      subtitle: "Endg\xFCltig \u2014 kann nicht r\xFCckg\xE4ngig gemacht werden."
    })), /*#__PURE__*/React.createElement(Dialog, {
      open: leave,
      tone: "danger",
      title: "Gruppe verlassen?",
      description: `Du verlierst den Zugriff auf „${g.name}“.`,
      confirmLabel: "Verlassen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setLeave(false);
        onBack();
      },
      onCancel: () => setLeave(false)
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: del,
      tone: "danger",
      title: "Gruppe l\xF6schen?",
      description: `„${g.name}“ und alle Videos und Sessions werden dauerhaft entfernt.`,
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setDel(false);
        onBack();
      },
      onCancel: () => setDel(false)
    }), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "\xC4nderungen gespeichert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }

  /* ── Invite (scan QR / enter code → confirm) ────────────────────────────── */
  function Invite({
    onBack
  }) {
    const [code, setCode] = React.useState('');
    const [confirm, setConfirm] = React.useState(null); // group object once a code resolves
    const [bad, setBad] = React.useState(false);
    function lookup(raw) {
      const c = (raw || code).trim().toUpperCase();
      if (c.length < 4) {
        setBad(true);
        return;
      }
      setBad(false);
      // Resolve to a sample group (any code is accepted in the kit).
      setConfirm(D.groups[0]);
    }
    if (confirm) {
      const det = D.groupMembers[confirm.id] || {
        desc: ''
      };
      return /*#__PURE__*/React.createElement(Sheet, {
        header: /*#__PURE__*/React.createElement(NavHeader, {
          title: "Einladung",
          onBack: () => setConfirm(null)
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 8,
          padding: '28px 8px 8px'
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        fallback: confirm.initials,
        alt: confirm.name,
        size: 72
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 21,
          fontWeight: 800,
          color: T.strong,
          letterSpacing: '-0.01em'
        }
      }, confirm.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted
        }
      }, confirm.members, " Mitglieder \xB7 Eingeladen von Coach Petra")), /*#__PURE__*/React.createElement(Card, {
        tone: "surface"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted
        }
      }, det.desc)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        label: "Gruppe beitreten",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "check",
          size: 18,
          color: "currentColor",
          sw: 2.4
        }),
        onClick: onBack,
        style: {
          width: '100%'
        }
      }), /*#__PURE__*/React.createElement(Button, {
        label: "Ablehnen",
        variant: "secondary",
        onClick: () => setConfirm(null),
        style: {
          width: '100%'
        }
      })));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe beitreten",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, #241509 0 14px, #1a0f08 14px 28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 168,
        height: 168,
        borderRadius: 24,
        border: '3px solid rgba(255,255,255,.9)',
        boxShadow: '0 0 0 9999px rgba(0,0,0,.28)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "qr-code",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }), "QR-Code im Rahmen platzieren")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted
      }
    }, "oder Code eingeben"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Einladungscode",
      error: bad ? 'Code ungültig — bitte prüfen.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: code,
      onChange: v => {
        setCode(v);
        setBad(false);
      },
      placeholder: "z. B. NEA-2K9",
      invalid: bad
    })), /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      disabled: !code.trim(),
      onClick: () => lookup(),
      style: {
        width: '100%'
      }
    })));
  }

  /* ── Reports (activity summary) ─────────────────────────────────────────── */
  function StatTile({
    icon,
    tone,
    label,
    count,
    footer
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        flex: 1,
        minWidth: 0,
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: tone,
      icon: icon
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em',
        lineHeight: 1
      }
    }, count), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2
      }
    }, footer));
  }
  function Reports({
    onBack
  }) {
    const R = D.reports;
    const [gran, setGran] = React.useState('month');
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Berichte",
        onBack: onBack
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      activeId: gran,
      onChange: setGran,
      tabs: [{
        id: 'month',
        label: 'Monat'
      }, {
        id: 'quarter',
        label: 'Quartal'
      }, {
        id: 'year',
        label: 'Jahr'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Vorheriger Zeitraum",
      variant: "ghost",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-left",
      size: 20,
      color: T.muted
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong
      }
    }, R.period), /*#__PURE__*/React.createElement(IconButton, {
      label: "N\xE4chster Zeitraum",
      variant: "ghost",
      size: "sm",
      disabled: true
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 20,
      color: "var(--role-outline)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "film",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Videos",
      count: R.videoCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: R.videoDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 20,
        color: "var(--role-success)"
      }),
      label: "Live-Coaching",
      count: R.liveCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        tone: "success",
        label: R.liveDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "users",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Reiter",
      count: R.peopleCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: `in ${R.groupCount} Gruppen`
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Aktivit\xE4t"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Badge, {
      label: `${R.events.length} im ${R.period}`
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, R.events.map(e => {
      const vid = e.kind === 'video';
      return /*#__PURE__*/React.createElement(Card, {
        key: e.id,
        tone: "surface",
        padding: 0,
        style: {
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(IconTile, {
        tone: vid ? 'neutral' : 'success',
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: vid ? 'film' : 'video',
          size: 18,
          color: vid ? T.primaryStrong : 'var(--role-success)'
        })
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.who, " \xB7 ", e.group, " \xB7 ", e.date)), /*#__PURE__*/React.createElement(Badge, {
        tone: vid ? 'neutral' : 'success',
        label: e.dur
      }));
    })));
  }

  /* ── Availability (manage session types / schedule / blocked) ───────────── */
  function RowCard({
    children,
    onEdit,
    onDelete
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '12px 12px 12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, children), onEdit ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Bearbeiten",
      variant: "ghost",
      size: "sm",
      onClick: onEdit
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pencil",
      size: 17,
      color: T.muted
    })) : null, /*#__PURE__*/React.createElement(IconButton, {
      label: "L\xF6schen",
      variant: "ghost",
      size: "sm",
      onClick: onDelete
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash-2",
      size: 17,
      color: "var(--role-danger)"
    })));
  }
  function Availability({
    onBack
  }) {
    const A = D.availability;
    const [groupId, setGroupId] = React.useState(D.groups[0].id);
    const [tab, setTab] = React.useState('types');
    const [add, setAdd] = React.useState(null); // which add-dialog is open
    const [del, setDel] = React.useState(null); // pending delete label
    const addLabel = {
      types: 'Session-Typ hinzufügen',
      schedule: 'Zeitfenster hinzufügen',
      blocked: 'Tag blockieren'
    }[tab];
    function section() {
      if (tab === 'types') {
        return A.sessionTypes.map(st => /*#__PURE__*/React.createElement(RowCard, {
          key: st.id,
          onEdit: () => setAdd('types'),
          onDelete: () => setDel(st.name)
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            flex: '0 1 auto',
            minWidth: 0,
            fontSize: 15,
            fontWeight: 700,
            color: T.strong,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }, st.name), /*#__PURE__*/React.createElement("span", {
          style: {
            flexShrink: 0
          }
        }, /*#__PURE__*/React.createElement(Badge, {
          tone: "primary",
          label: `${st.mins} Min`
        }))), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 3,
            lineHeight: 1.4
          }
        }, st.desc)));
      }
      if (tab === 'schedule') {
        return A.schedule.map(s => /*#__PURE__*/React.createElement(RowCard, {
          key: s.id,
          onEdit: () => setAdd('schedule'),
          onDelete: () => setDel(s.day)
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }
        }, /*#__PURE__*/React.createElement(IconTile, {
          tone: "neutral",
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "calendar",
            size: 18,
            color: T.primaryStrong
          })
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 15,
            fontWeight: 700,
            color: T.strong
          }
        }, s.day), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 1
          }
        }, s.from, " \u2013 ", s.to)))));
      }
      return A.blocked.map(b => /*#__PURE__*/React.createElement(RowCard, {
        key: b.id,
        onDelete: () => setDel(b.date)
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "calendar-off",
          size: 18,
          color: "var(--role-danger)"
        })
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: T.strong
        }
      }, b.date), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: T.muted,
          marginTop: 1
        }
      }, b.range, b.reason ? ` · ${b.reason}` : '')))));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Verf\xFCgbarkeit",
        onBack: onBack
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 21,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Verf\xFCgbarkeit verwalten"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.muted,
        marginTop: 4,
        lineHeight: 1.5
      }
    }, "Lege fest, wann und wof\xFCr Reiter dich f\xFCr Live-Coaching buchen k\xF6nnen.")), /*#__PURE__*/React.createElement(Field, {
      label: "Gruppe"
    }, /*#__PURE__*/React.createElement(Select, {
      value: groupId,
      onChange: setGroupId,
      options: D.groups.map(g => ({
        value: g.id,
        label: g.name
      }))
    })), /*#__PURE__*/React.createElement(Tabs, {
      activeId: tab,
      onChange: setTab,
      tabs: [{
        id: 'types',
        label: 'Session-Typen'
      }, {
        id: 'schedule',
        label: 'Wochenplan'
      }, {
        id: 'blocked',
        label: 'Geblockt'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, section()), /*#__PURE__*/React.createElement(Button, {
      label: addLabel,
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "plus",
        size: 17,
        color: "var(--role-on-secondary-container)",
        sw: 2.4
      }),
      onClick: () => setAdd(tab),
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'types',
      title: "Session-Typ",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Video-Review"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Dauer"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "30",
      options: [{
        value: '30',
        label: '30 Minuten'
      }, {
        value: '45',
        label: '45 Minuten'
      }, {
        value: '60',
        label: '60 Minuten'
      }]
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      rows: 2,
      placeholder: "Was umfasst diese Session?"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'schedule',
      title: "Zeitfenster",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Wochentag"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "mon",
      options: [{
        value: 'mon',
        label: 'Montag'
      }, {
        value: 'tue',
        label: 'Dienstag'
      }, {
        value: 'wed',
        label: 'Mittwoch'
      }, {
        value: 'thu',
        label: 'Donnerstag'
      }, {
        value: 'fri',
        label: 'Freitag'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Von"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "16:00"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Bis"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "19:00"
    })))))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'blocked',
      title: "Tag blockieren",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Datum"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "Fr 27 Jun"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Grund",
      hint: "Optional"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Turnier"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: !!del,
      tone: "danger",
      title: "Wirklich l\xF6schen?",
      description: del ? `„${del}“ wird entfernt.` : '',
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => setDel(null),
      onCancel: () => setDel(null)
    }));
  }
  Object.assign(window.StridoScreens, {
    CreateGroup,
    GroupPreferences,
    Invite,
    Reports,
    Availability
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens3.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/data.js
try { (() => {
// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: {
    name: 'Mia Halvorsen',
    initials: 'MH',
    role: 'Rider',
    roleType: 'student',
    email: 'mia.halvorsen@example.com',
    language: 'de',
    timezone: 'Europe/Berlin'
  },
  groups: [{
    id: 'g1',
    name: 'Nord Eventing Academy',
    initials: 'NE',
    members: 14
  }, {
    id: 'g2',
    name: 'Trail & Dressage Club',
    initials: 'TD',
    members: 9
  }],
  videos: [{
    id: 'v1',
    title: 'Combination line — take 2',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 3,
    duration: '0:48',
    desc: 'Two strides in, felt rushed to the oxer. Coach asked me to upload the warm-up and the second attempt too so we can compare the canter rhythm across all three before the lesson on Friday.',
    parts: [{
      id: 'p1',
      label: 'Aufwärmen',
      duration: '1:12',
      status: 'ready'
    }, {
      id: 'p2',
      label: 'Versuch 1',
      duration: '0:48',
      status: 'ready'
    }, {
      id: 'p3',
      label: 'Versuch 2',
      duration: '0:51',
      status: 'processing'
    }]
  }, {
    id: 'v2',
    title: 'Sitting trot — long side',
    group: 'Trail & Dressage Club',
    gi: 'TD',
    status: 'completed',
    reviews: 6,
    duration: '1:22',
    desc: 'Working on a steadier contact.'
  }, {
    id: 'v3',
    title: 'Warm-up canter transitions',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'pending',
    reviews: 1,
    duration: '2:05',
    desc: 'Left lead pickup is sticky.',
    parts: [{
      id: 'q1',
      label: 'Schritt',
      duration: '0:54',
      status: 'ready'
    }, {
      id: 'q2',
      label: 'Trab links',
      duration: '1:08',
      status: 'ready'
    }, {
      id: 'q3',
      label: 'Trab rechts',
      duration: '1:02',
      status: 'ready'
    }, {
      id: 'q4',
      label: 'Galopp links',
      duration: '0:47',
      status: 'ready'
    }, {
      id: 'q5',
      label: 'Galopp rechts',
      duration: '0:51',
      status: 'ready'
    }, {
      id: 'q6',
      label: 'Übergänge',
      duration: '1:15',
      status: 'ready'
    }, {
      id: 'q7',
      label: 'Cool-down',
      duration: '0:39',
      status: 'ready'
    }, {
      id: 'q8',
      label: 'Nachbereitung',
      duration: '0:28',
      status: 'processing'
    }]
  }, {
    id: 'v4',
    title: 'Grid work — bounce to one',
    group: 'Nord Eventing Academy',
    gi: 'NE',
    status: 'waiting_upload',
    reviews: 0,
    duration: '0:36',
    desc: ''
  }],
  reviews: [{
    id: 'r1',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:12',
    when: '2h ago',
    body: 'Good rhythm on the approach — eyes up a stride earlier and the distance comes to you.'
  }, {
    id: 'r2',
    author: 'Coach Petra',
    initials: 'CP',
    ts: '0:31',
    when: '2h ago',
    body: 'Here you tipped forward over the first element. Keep your shoulders back and let the horse close the gap.',
    replies: [{
      id: 'r2a',
      author: 'Mia Halvorsen',
      initials: 'MH',
      when: '1h ago',
      body: 'Makes sense — I felt the lean. Will drill it tomorrow.'
    }]
  }],
  bookings: [{
    id: 'b1',
    type: 'Video review session',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Tue 18 Jun · 16:00',
    mins: 30,
    status: 'pending',
    joinable: true
  }, {
    id: 'b2',
    type: 'Flatwork deep-dive',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Fri 21 Jun · 09:30',
    mins: 45,
    status: 'pending',
    joinable: false
  }, {
    id: 'b3',
    type: 'Jumping technique',
    who: 'Coach Lars',
    role: 'expert',
    when: 'Mon 10 Jun · 17:00',
    mins: 30,
    status: 'done',
    joinable: false,
    recording: 'ready'
  }, {
    id: 'b4',
    type: 'Course walk-through',
    who: 'Coach Petra',
    role: 'expert',
    when: 'Thu 6 Jun · 14:00',
    mins: 30,
    status: 'cancelled',
    joinable: false,
    reason: 'Horse off work.'
  }],
  notifications: 2,
  notificationList: [{
    id: 'n1',
    kind: 'review',
    unread: true,
    day: 'today',
    when: 'vor 2 Std',
    title: 'Neues Feedback von Coach Petra',
    body: '„Kombination — Versuch 2“ wurde kommentiert.'
  }, {
    id: 'n2',
    kind: 'invite',
    unread: true,
    day: 'today',
    when: 'vor 5 Std',
    title: 'Einladung in eine Gruppe',
    body: 'Coach Petra hat dich in „Nord Eventing Academy“ eingeladen.',
    code: 'NEA-2K9'
  }, {
    id: 'n3',
    kind: 'booking',
    unread: false,
    day: 'earlier',
    when: 'Gestern',
    title: 'Session bestätigt',
    body: 'Video-Review mit Coach Petra · Di 18 Jun, 16:00.'
  }, {
    id: 'n4',
    kind: 'upload',
    unread: false,
    day: 'earlier',
    when: 'Gestern',
    title: 'Upload abgeschlossen',
    body: '„Aussitzen im Trab — lange Seite“ ist bereit.'
  }, {
    id: 'n5',
    kind: 'system',
    unread: false,
    day: 'earlier',
    when: 'Mo',
    title: 'Willkommen bei Strido',
    body: 'Lade dein erstes Video hoch, um Feedback zu erhalten.'
  }],
  // Group membership detail (keyed by group id) for the group-detail view.
  groupMembers: {
    g1: {
      desc: 'Eventing-Gruppe für Vielseitigkeitsreiter — wöchentliches Video-Feedback und Live-Coaching.',
      experts: [{
        id: 'e1',
        name: 'Petra Nilsson',
        initials: 'PN',
        role: 'Cheftrainerin'
      }],
      students: [{
        id: 's1',
        name: 'Mia Halvorsen',
        initials: 'MH',
        role: 'Reiterin'
      }, {
        id: 's2',
        name: 'Jonas Berg',
        initials: 'JB',
        role: 'Reiter'
      }, {
        id: 's3',
        name: 'Lena Sund',
        initials: 'LS',
        role: 'Reiterin'
      }]
    },
    g2: {
      desc: 'Dressur- und Geländegruppe für entspanntes, technisches Training.',
      experts: [{
        id: 'e2',
        name: 'Lars Moen',
        initials: 'LM',
        role: 'Trainer'
      }],
      students: [{
        id: 's1',
        name: 'Mia Halvorsen',
        initials: 'MH',
        role: 'Reiterin'
      }, {
        id: 's4',
        name: 'Erik Dahl',
        initials: 'ED',
        role: 'Reiter'
      }]
    }
  },
  // Reports / activity summary (expert role view).
  reports: {
    period: 'März 2026',
    videoCount: 18,
    videoDur: '4 Std 12 Min',
    liveCount: 6,
    liveDur: '3 Std 30 Min',
    peopleCount: 9,
    groupCount: 2,
    events: [{
      id: 'a1',
      kind: 'video',
      title: 'Kombination — Versuch 2',
      who: 'Mia Halvorsen',
      group: 'Nord Eventing Academy',
      date: '18 Mär',
      dur: '0:48 Min'
    }, {
      id: 'a2',
      kind: 'live',
      title: 'Live-Coaching',
      who: 'Jonas Berg',
      group: 'Nord Eventing Academy',
      date: '16 Mär',
      dur: '45 Min'
    }, {
      id: 'a3',
      kind: 'video',
      title: 'Aussitzen im Trab',
      who: 'Lena Sund',
      group: 'Trail & Dressage Club',
      date: '14 Mär',
      dur: '1:22 Min'
    }, {
      id: 'a4',
      kind: 'video',
      title: 'Galopp-Übergänge',
      who: 'Erik Dahl',
      group: 'Nord Eventing Academy',
      date: '11 Mär',
      dur: '2:05 Min'
    }, {
      id: 'a5',
      kind: 'live',
      title: 'Live-Coaching',
      who: 'Mia Halvorsen',
      group: 'Trail & Dressage Club',
      date: '8 Mär',
      dur: '30 Min'
    }]
  },
  // Expert availability management.
  availability: {
    sessionTypes: [{
      id: 'st1',
      name: 'Video-Review',
      mins: 30,
      desc: 'Detailliertes Feedback zu einem hochgeladenen Video.'
    }, {
      id: 'st2',
      name: 'Live-Coaching',
      mins: 45,
      desc: 'Eins-zu-eins-Session in Echtzeit per Video.'
    }],
    schedule: [{
      id: 'av1',
      day: 'Montag',
      from: '16:00',
      to: '19:00'
    }, {
      id: 'av2',
      day: 'Mittwoch',
      from: '09:00',
      to: '12:00'
    }, {
      id: 'av3',
      day: 'Freitag',
      from: '14:00',
      to: '18:00'
    }],
    blocked: [{
      id: 'bl1',
      date: 'Fr 27 Jun',
      range: 'Ganzer Tag',
      reason: 'Turnier'
    }, {
      id: 'bl2',
      date: 'Mi 2 Jul',
      range: '14:00 – 17:00',
      reason: ''
    }]
  },
  // Coaching booking flow data.
  coaching: {
    // Session types lead the flow ("Was?"): each carries duration + price so the
    // running summary bar can show cost from the first choice onward.
    sessionTypes: [{
      id: 'st1',
      name: 'Video-Review',
      mins: 30,
      price: 39,
      icon: 'play-circle',
      desc: 'Detailliertes Feedback zu einem hochgeladenen Video.'
    }, {
      id: 'st2',
      name: 'Live-Coaching',
      mins: 45,
      price: 69,
      icon: 'video',
      desc: 'Eins-zu-eins-Session in Echtzeit per Video.'
    }, {
      id: 'st3',
      name: 'Trainingsplan',
      mins: 20,
      price: 29,
      icon: 'clipboard-list',
      desc: 'Wochenplanung mit Zielen und passenden Übungen.'
    }],
    experts: [{
      id: 'e1',
      name: 'Petra Nilsson',
      initials: 'PN',
      role: 'Cheftrainerin',
      specialty: 'Vielseitigkeit & Springen',
      rating: 4.9,
      reviews: 128
    }, {
      id: 'e2',
      name: 'Lars Moen',
      initials: 'LM',
      role: 'Dressurtrainer',
      specialty: 'Dressur & Grundausbildung',
      rating: 4.8,
      reviews: 94
    }, {
      id: 'e3',
      name: 'Jonas Berg',
      initials: 'JB',
      role: 'Geländetrainer',
      specialty: 'Cross & Kondition',
      rating: 4.7,
      reviews: 61
    }],
    // Date rail ("Wann?"). isToday drives the "Heute"-label.
    days: [{
      id: 'd0',
      dow: 'Di',
      date: '18',
      month: 'Jun',
      isToday: true
    }, {
      id: 'd1',
      dow: 'Mi',
      date: '19',
      month: 'Jun'
    }, {
      id: 'd2',
      dow: 'Do',
      date: '20',
      month: 'Jun'
    }, {
      id: 'd3',
      dow: 'Fr',
      date: '21',
      month: 'Jun'
    }, {
      id: 'd4',
      dow: 'Sa',
      date: '22',
      month: 'Jun'
    }, {
      id: 'd5',
      dow: 'So',
      date: '23',
      month: 'Jun'
    }],
    // Availability is per expert and per day — start times only (the session
    // duration fills in the end). Missing day = no free slots that day.
    availability: {
      e1: {
        d0: ['16:00', '16:45', '17:30'],
        d1: ['09:00', '10:15'],
        d3: ['14:00', '15:00', '16:30']
      },
      e2: {
        d1: ['08:30', '09:15', '11:00'],
        d2: ['13:00', '14:30'],
        d4: ['10:00', '11:30']
      },
      e3: {
        d0: ['18:00'],
        d2: ['16:00', '17:00'],
        d3: ['09:30', '10:30', '12:00'],
        d5: ['11:00', '14:00']
      }
    }
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/data.js", error: String((e && e.message) || e) }); }

// ui_kits/mobile/screens.jsx
try { (() => {
/* Strido mobile UI kit — screens (Material You).
 * Composes the design-system primitives from window.StridoDesignSystem_dc14ef.
 * Exposes window.StridoScreens, consumed by index.html.
 * German copy, matching the approved Home/Videos redesign.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;

  /* Platform switch (driven by the Tweaks panel via setPlatform). The wrapped DS
     components auto-inject the current platform, so every screen renders the
     Material or the iOS variant from one source. Components with no native iOS
     divergence (Fab, Badge, Avatar, EmptyState, IconTile) are used unwrapped. */
  let PLATFORM = 'material';
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  function setPlatform(p) {
    PLATFORM = p === 'ios' ? 'ios' : 'material';
    PlatformState.current = PLATFORM;
  }
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button);
  const IconButton = _w(DS.IconButton);
  const Card = _w(DS.Card);
  const Chip = _w(DS.Chip);
  const SegmentedButton = _w(DS.SegmentedButton);
  const Stepper = _w(DS.Stepper);
  const ProgressBar = _w(DS.ProgressBar);
  const Textarea = _w(DS.Textarea);
  const ListItem = _w(DS.ListItem);
  const Switch = _w(DS.Switch);
  const Divider = _w(DS.Divider);
  const {
    Fab,
    Badge,
    Avatar,
    EmptyState,
    IconTile,
    LargeTitleBar
  } = DS;
  const D = window.StridoData;

  /* Lucide icon helper — renders an <i> Lucide replaces with an SVG after mount. */
  function Icon({
    n,
    size = 20,
    color = 'currentColor',
    sw = 2,
    style
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color,
        strokeWidth: sw,
        display: 'inline-flex',
        flexShrink: 0,
        ...style
      }
    });
  }
  const T = {
    strong: 'var(--role-on-surface)',
    muted: 'var(--role-on-surface-variant)',
    primary: 'var(--role-accent)',
    primaryStrong: 'var(--role-accent-strong)',
    bg: 'var(--role-background)'
  };

  /* Tiny nav bus so leaf components (e.g. the header bell) can push screens
     without threading the go() callback through every screen. App registers go(). */
  let _nav = null;
  function setNav(fn) {
    _nav = fn;
  }
  function navTo(action) {
    if (_nav) _nav(action);
  }

  /* German labels for the English sample data ------------------------------- */
  const TYPE_DE = {
    'Video review session': 'Video-Review',
    'Flatwork deep-dive': 'Dressur-Deep-Dive',
    'Jumping technique': 'Spring-Technik',
    'Course walk-through': 'Parcours-Begehung'
  };
  const VIDEO_DE = {
    'Combination line — take 2': 'Kombination — Versuch 2',
    'Sitting trot — long side': 'Aussitzen im Trab — lange Seite',
    'Warm-up canter transitions': 'Galopp-Übergänge im Warm-up',
    'Grid work — bounce to one': 'Gymnastikreihe — Bounce'
  };
  const dt = s => TYPE_DE[s] || s;
  const dv = s => VIDEO_DE[s] || s;
  function videoStatus(status) {
    if (status === 'completed') return {
      tone: 'success',
      label: 'Geprüft',
      icon: 'check-circle-2'
    };
    if (status === 'pending') return {
      tone: 'primary',
      label: 'In Prüfung',
      icon: 'clock'
    };
    return {
      tone: 'neutral',
      label: 'Lädt hoch',
      icon: 'upload-cloud'
    };
  }

  /* ── Shared screen shell: fixed header + scroll area ────────────────────── */
  function Screen({
    header,
    children,
    pad = 16,
    gap = 22,
    bottom = 116
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `0 0 ${bottom}px`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px 0`
      }
    }, children)));
  }

  /* Plain title top app bar (Videos / Sessions / Groups / Profile). */
  /* Plain title top app bar (Material) / large-title nav bar (iOS). `action` is
     the screen's primary action — on iOS it surfaces as a nav-bar button (iOS has
     no FAB); on Material it's null (the FAB in index.html handles it). */
  function bellNode() {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 23,
      color: "var(--role-accent)"
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -1,
        right: -1,
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--role-danger)',
        border: '1.5px solid var(--role-background)'
      }
    }) : null);
  }
  function TopBar({
    title,
    action
  }) {
    if (isIOS()) {
      const actions = [];
      if (action) actions.push({
        id: 'primary',
        label: action.label,
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: action.icon,
          size: 26,
          color: "var(--role-accent)"
        }),
        onPress: action.onPress
      });
      actions.push({
        id: 'bell',
        label: 'Benachrichtigungen',
        icon: bellNode(),
        onPress: () => navTo({
          push: {
            screen: 'notifications'
          }
        })
      });
      return /*#__PURE__*/React.createElement(LargeTitleBar, {
        platform: "ios",
        title: title,
        actions: actions
      });
    }
    if (DS.TopAppBar) {
      return /*#__PURE__*/React.createElement(DS.TopAppBar, {
        platform: "material",
        title: title,
        trailing: /*#__PURE__*/React.createElement(Bell, null),
        style: {
          background: T.bg
        }
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px 12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: T.strong,
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement(Bell, null));
  }
  function Bell() {
    return /*#__PURE__*/React.createElement("button", {
      "aria-label": "Benachrichtigungen",
      onClick: () => navTo({
        push: {
          screen: 'notifications'
        }
      }),
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bell",
      size: 22,
      color: T.strong
    }), D.notifications ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        boxSizing: 'border-box',
        background: 'var(--role-accent)',
        color: 'var(--role-on-accent)',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        border: '2px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, D.notifications) : null);
  }
  function SectionHeader({
    title,
    action,
    onAction
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), action ? /*#__PURE__*/React.createElement("button", {
      onClick: onAction,
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, action) : null);
  }

  /* ── Reusable nav header for pushed screens ─────────────────────────────── */
  function NavHeader({
    title,
    onBack,
    right
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minHeight: 44,
          padding: '6px 10px',
          background: T.bg
        }
      }, onBack ? /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        "aria-label": "Zur\xFCck",
        style: {
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          color: 'var(--role-accent)',
          zIndex: 1
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-left",
        size: 27,
        color: "var(--role-accent)",
        sw: 2.4
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 17,
          letterSpacing: '-0.01em'
        }
      }, "Zur\xFCck")) : /*#__PURE__*/React.createElement("div", {
        style: {
          width: 8
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none'
        }
      }, title), /*#__PURE__*/React.createElement("div", {
        style: {
          marginLeft: 'auto',
          zIndex: 1
        }
      }, right));
    }
    if (DS.TopAppBar) {
      return /*#__PURE__*/React.createElement(DS.TopAppBar, {
        platform: "material",
        title: title,
        style: {
          background: T.bg
        },
        leading: onBack ? /*#__PURE__*/React.createElement(IconButton, {
          variant: "ghost",
          label: "Zur\xFCck",
          onClick: onBack
        }, /*#__PURE__*/React.createElement(Icon, {
          n: "arrow-left",
          size: 24,
          color: T.strong
        })) : null,
        trailing: right
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 8px 8px 4px',
        background: T.bg
      }
    }, onBack ? /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Zur\xFCck",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "arrow-left",
      size: 24,
      color: T.strong
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), right);
  }

  /* ── Video tile (Material filled) ───────────────────────────────────────── */
  function VideoTile({
    v,
    onClick
  }) {
    const s = videoStatus(v.status);
    const uploading = v.status === 'waiting_upload';
    const ios = isIOS();
    const tileStyle = ios ? {
      borderRadius: 14,
      background: 'var(--role-surface)',
      boxShadow: '0 1px 3px rgba(38,24,15,0.05), 0 8px 22px -10px rgba(38,24,15,0.13), 0 0 0 0.5px rgba(38,24,15,0.05)'
    } : {
      borderRadius: 'var(--radius-tile)',
      background: 'var(--role-surface-1)'
    };
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        padding: 11,
        ...tileStyle
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 100,
        height: 66,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, uploading ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 999,
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 16,
      color: "#fff",
      sw: 2.4,
      style: {
        marginLeft: 2
      }
    })), !uploading ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 5,
        bottom: 5,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,.6)',
        padding: '1px 5px',
        borderRadius: 6
      }
    }, v.duration) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, dv(v.title)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, v.group), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), v.reviews ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 14,
      color: T.muted
    }), v.reviews) : null)));
  }

  /* ── Login ──────────────────────────────────────────────────────────────── */
  function Login({
    onSignIn
  }) {
    const [busy, setBusy] = React.useState(false);
    function go() {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        onSignIn();
      }, 700);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: T.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 4,
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'var(--role-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 32,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, "S")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em'
      }
    }, "Strido"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: T.muted
      }
    }, "Video-Coaching f\xFCr Reiter")), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: 20,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Willkommen zur\xFCck"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '8px 0 0',
        fontSize: 14,
        lineHeight: 1.6,
        color: T.muted
      }
    }, "Lade Reitvideos hoch und erhalte sekundengenaues Feedback \u2014 oder geh live, eins zu eins."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Anmelden",
      loading: busy,
      onClick: go,
      style: {
        width: '100%'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Konto erstellen",
      variant: "tonal",
      onClick: go,
      style: {
        width: '100%'
      }
    })))));
  }

  /* ── Home ───────────────────────────────────────────────────────────────── */
  function HeroSession({
    go
  }) {
    const b = D.bookings.find(x => x.status === 'pending') || D.bookings[0];
    return /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      padding: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        opacity: .9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "calendar-clock",
      size: 14,
      sw: 2.4
    }), "N\xE4chste Session"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: 'var(--role-surface)',
        color: T.strong
      }
    }, "in 2 Tagen")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1.25
      }
    }, dt(b.type), " mit ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13.5,
        fontWeight: 600,
        opacity: .92
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 15,
      sw: 2.2
    }), b.when, " \xB7 ", b.mins, " Min"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 18,
        color: "currentColor"
      }),
      onClick: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      }),
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Details",
      variant: "secondary",
      onClick: () => go({
        tab: 'sessions'
      }),
      style: {
        background: 'transparent',
        borderColor: 'currentColor',
        color: 'inherit'
      }
    })));
  }
  const STEPS = [{
    done: true,
    label: 'Gruppe beigetreten',
    desc: 'Du kannst in deiner Gruppe Videos hochladen und Coaching buchen.'
  }, {
    done: false,
    label: 'Erstes Video hochladen',
    desc: 'Teile ein Trainingsvideo, damit ein Experte es prüfen kann.'
  }, {
    done: false,
    label: 'Live-Coaching buchen',
    desc: 'Reserviere einen Termin, wenn dein Experte verfügbar ist.'
  }];
  function StepRow({
    s
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        flexShrink: 0,
        marginTop: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: s.done ? 'var(--role-accent)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--role-outline)'
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 14,
      color: "var(--role-on-accent)",
      sw: 3
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: s.done ? T.muted : T.strong
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        color: T.muted,
        marginTop: 2
      }
    }, s.desc)), !s.done ? /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 18,
      color: T.muted,
      style: {
        marginTop: 3
      }
    }) : null);
  }
  function StepsCard() {
    const done = STEPS.filter(s => s.done).length;
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '16px 18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, "Erste Schritte"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.muted
      }
    }, done, "/", STEPS.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: done,
      max: STEPS.length
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        borderTop: i ? '1px solid var(--role-outline)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(StepRow, {
      s: s
    })))));
  }
  function Home({
    go
  }) {
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Strido"
      })
    }, /*#__PURE__*/React.createElement(HeroSession, {
      go: go
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      title: "Deine Videos",
      action: "Alle ansehen",
      onAction: () => go({
        tab: 'videos'
      })
    }), D.videos.slice(0, 2).map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))), /*#__PURE__*/React.createElement(StepsCard, null));
  }

  /* ── Videos ─────────────────────────────────────────────────────────────── */
  function Videos({
    go,
    primaryAction
  }) {
    const [filter, setFilter] = React.useState('all');
    const reviewed = D.videos.filter(v => v.status === 'completed').length;
    const list = filter === 'all' ? D.videos : filter === 'reviewed' ? D.videos.filter(v => v.status === 'completed') : D.videos.filter(v => v.status !== 'completed');
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Videos",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: filter,
      onChange: setFilter,
      segments: [{
        id: 'all',
        label: 'Alle'
      }, {
        id: 'toReview',
        label: 'Zu prüfen'
      }, {
        id: 'reviewed',
        label: 'Geprüft'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        padding: '0 4px'
      }
    }, list.length, " Videos"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, list.map(v => /*#__PURE__*/React.createElement(VideoTile, {
      key: v.id,
      v: v,
      onClick: () => go({
        push: {
          screen: 'asset',
          id: v.id
        }
      })
    }))));
  }

  /* ── Asset detail ───────────────────────────────────────────────────────── */
  function ReviewBlock({
    r,
    isReply
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: r.initials,
      alt: r.author,
      size: isReply ? 28 : 36,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.strong
      }
    }, r.author), r.ts ? /*#__PURE__*/React.createElement("button", {
      "aria-label": `Zu ${r.ts} springen`,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 9px 0 7px',
        borderRadius: 12,
        background: 'var(--role-accent-container)',
        color: 'var(--role-on-accent-container)',
        fontSize: 12.5,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 11,
      color: "var(--role-on-accent-container)",
      sw: 2.6,
      style: {
        marginLeft: 0
      }
    }), r.ts) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        fontSize: 14,
        lineHeight: 1.55,
        color: T.strong
      }
    }, r.body), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, r.when), !isReply ? /*#__PURE__*/React.createElement("button", {
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "reply",
      size: 14,
      color: T.muted
    }), " Antworten") : null)));
  }
  function AssetDetail({
    id,
    onBack
  }) {
    const v = D.videos.find(x => x.id === id) || D.videos[0];
    const [draft, setDraft] = React.useState('');
    const [atTime, setAtTime] = React.useState(false);
    const parts = v.parts || [];
    const hasParts = parts.length > 1;
    const manyParts = parts.length > 5;
    const firstReady = Math.max(0, parts.findIndex(p => p.status !== 'processing'));
    const [activePart, setActivePart] = React.useState(hasParts ? firstReady : 0);
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [descOpen, setDescOpen] = React.useState(false);
    const descLong = (v.desc || '').length > 90;
    const cur = hasParts ? parts[activePart] : null;
    const s = videoStatus(v.status);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: dv(v.title),
      onBack: onBack
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: 'linear-gradient(135deg,#3a2417,#1a0f08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "play",
      size: 26,
      color: "#fff",
      sw: 2.2,
      style: {
        marginLeft: 3
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#fff'
      }
    }, "0:12"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(ProgressBar, {
      value: 0.28,
      height: 4
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'rgba(255,255,255,.7)'
      }
    }, cur ? cur.duration : v.duration))), hasParts && !manyParts ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 'none',
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, "Teile"), parts.map((p, i) => {
      const active = i === activePart;
      const proc = p.status === 'processing';
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: () => {
          if (!proc) setActivePart(i);
        },
        "aria-label": `Teil ${i + 1}${proc ? ', wird verarbeitet' : ', ' + p.duration}`,
        style: {
          all: 'unset',
          flex: 'none',
          cursor: proc ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 30,
          padding: '0 12px',
          borderRadius: 15,
          fontSize: 12.5,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: active ? 700 : 600,
          color: proc ? T.muted : active ? 'var(--role-on-secondary-container)' : T.strong,
          background: active ? 'var(--role-secondary-container)' : 'transparent',
          border: active ? '1px solid transparent' : '1px solid var(--role-outline)',
          opacity: proc ? 0.7 : 1
        }
      }, proc ? /*#__PURE__*/React.createElement(Icon, {
        n: "loader",
        size: 12,
        color: T.muted
      }) : null, "Teil ", i + 1, proc ? null : /*#__PURE__*/React.createElement("span", {
        style: {
          opacity: 0.7
        }
      }, " \xB7 ", p.duration));
    })) : null, hasParts && manyParts ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 0'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted
      }
    }, "Teile"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSheetOpen(true),
      "aria-label": `Teil ${activePart + 1} von ${parts.length} — alle Teile anzeigen`,
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 6px 0 12px',
        borderRadius: 16,
        border: '1px solid var(--role-outline)',
        color: T.strong,
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "Teil ", activePart + 1), " von ", parts.length, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-down",
      size: 16,
      color: T.muted
    }))) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: v.gi,
      alt: v.group,
      size: 24,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 700,
        color: T.strong,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, v.group), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    })), v.desc ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: descOpen || !descLong ? {
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.5
      } : {
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, v.desc), descLong ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setDescOpen(o => !o),
      style: {
        all: 'unset',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, descOpen ? 'Weniger anzeigen' : 'Mehr anzeigen') : null) : null), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "message-circle",
      size: 18,
      color: T.primaryStrong
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong
      }
    }, "Kommentare"), /*#__PURE__*/React.createElement(Badge, {
      label: D.reviews.length
    })), D.reviews.map(r => /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: r
    }), (r.replies || []).map(rr => /*#__PURE__*/React.createElement("div", {
      key: rr.id,
      style: {
        paddingLeft: 22
      }
    }, /*#__PURE__*/React.createElement(ReviewBlock, {
      r: rr,
      isReply: true
    }))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: draft,
      onChange: setDraft,
      rows: 2,
      placeholder: "Kommentar hinzuf\xFCgen\u2026"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Chip, {
      label: "Bei 0:12",
      selected: atTime,
      showCheck: false,
      onClick: () => setAtTime(a => !a)
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verbessern",
      variant: "ghost",
      size: "sm",
      disabled: !draft.trim()
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "sparkles",
      size: 18,
      color: T.muted
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Senden",
      variant: "primary",
      size: "sm",
      disabled: !draft.trim()
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "send",
      size: 18,
      color: "currentColor"
    }))))))), sheetOpen ? /*#__PURE__*/React.createElement("div", {
      onClick: () => setSheetOpen(false),
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,.4)',
        display: 'flex',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxHeight: '72%',
        background: 'var(--role-surface-1)',
        borderRadius: '28px 28px 0 0',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 8,
        boxShadow: '0 -8px 30px rgba(0,0,0,.18)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0 4px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--role-outline)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px 10px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong
      }
    }, "Teile"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.muted
      }
    }, parts.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }
    }, parts.map((p, i) => {
      const active = i === activePart;
      const proc = p.status === 'processing';
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: () => {
          if (!proc) {
            setActivePart(i);
            setSheetOpen(false);
          }
        },
        style: {
          all: 'unset',
          cursor: proc ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: active ? 'var(--role-secondary-container)' : 'transparent',
          opacity: proc ? 0.6 : 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 22,
          display: 'inline-flex',
          justifyContent: 'center'
        }
      }, active ? /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 18,
        color: "var(--role-on-secondary-container)",
        sw: 2.6
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: T.muted,
          fontVariantNumeric: 'tabular-nums'
        }
      }, i + 1)), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 15,
          fontWeight: active ? 700 : 600,
          color: active ? 'var(--role-on-secondary-container)' : T.strong
        }
      }, "Teil ", i + 1), proc ? /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12.5,
          fontWeight: 700,
          color: T.muted
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "loader",
        size: 13,
        color: T.muted
      }), "Wird verarbeitet") : /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: active ? 'var(--role-on-secondary-container)' : T.muted,
          fontVariantNumeric: 'tabular-nums'
        }
      }, p.duration));
    })))) : null);
  }

  /* ── Sessions ───────────────────────────────────────────────────────────── */
  function bookingStatus(status) {
    if (status === 'cancelled') return {
      tone: 'danger',
      label: 'Storniert'
    };
    if (status === 'done') return {
      tone: 'neutral',
      label: 'Erledigt'
    };
    return {
      tone: 'primary',
      label: 'Anstehend'
    };
  }
  function BookingCard({
    b,
    onJoin
  }) {
    const s = bookingStatus(b.status);
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }
    }, dt(b.type)), /*#__PURE__*/React.createElement(Badge, {
      tone: s.tone,
      label: s.label
    }), b.recording === 'ready' ? /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      label: "Aufnahme bereit"
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: T.muted
      }
    }, "Experte: ", b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13.5,
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      size: 14,
      color: T.muted
    }), b.when, " \xB7 ", b.mins, " Min"), b.reason ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--role-danger)'
      }
    }, "Grund: ", b.reason) : null, b.joinable || b.recording === 'ready' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: 'flex',
        gap: 8
      }
    }, b.joinable ? /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 16,
        color: "currentColor"
      }),
      onClick: onJoin
    }) : null, b.recording === 'ready' ? /*#__PURE__*/React.createElement(Button, {
      label: "Aufnahme ansehen",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "play",
        size: 16,
        color: "var(--role-on-secondary-container)"
      })
    }) : null) : null);
  }
  function Sessions({
    go,
    primaryAction
  }) {
    const [tab, setTab] = React.useState('upcoming');
    const upcoming = D.bookings.filter(b => b.status === 'pending');
    const past = D.bookings.filter(b => b.status === 'done');
    const cancelled = D.bookings.filter(b => b.status === 'cancelled');
    const list = tab === 'past' ? past : tab === 'cancelled' ? cancelled : upcoming;
    const empty = {
      upcoming: 'anstehenden',
      past: 'vergangenen',
      cancelled: 'stornierten'
    }[tab];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Sessions",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: tab,
      onChange: setTab,
      segments: [{
        id: 'upcoming',
        label: 'Anstehend'
      }, {
        id: 'past',
        label: 'Vergangen'
      }, {
        id: 'cancelled',
        label: 'Storniert'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, list.length ? list.map(b => /*#__PURE__*/React.createElement(BookingCard, {
      key: b.id,
      b: b,
      onJoin: () => go({
        push: {
          screen: 'call',
          id: b.id
        }
      })
    })) : /*#__PURE__*/React.createElement(EmptyState, {
      title: `Keine ${empty} Sessions`,
      description: "Deine Sessions erscheinen hier.",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "calendar-clock",
        size: 24,
        color: T.primary
      })
    })));
  }

  /* ── Call ───────────────────────────────────────────────────────────────── */
  function Call({
    id,
    onLeave
  }) {
    const b = D.bookings.find(x => x.id === id) || D.bookings[0];
    const [mic, setMic] = React.useState(true);
    const [cam, setCam] = React.useState(true);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        background: '#0c0704',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: 'radial-gradient(120% 80% at 50% 35%, #3a2417, #0c0704)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: "CP",
      alt: b.who,
      size: 84,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: 700,
        color: '#fff'
      }
    }, b.who), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        fontSize: 13,
        color: 'rgba(255,255,255,.6)'
      }
    }, "Warte auf den anderen Teilnehmer\u2026"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 14,
        top: 14,
        width: 84,
        height: 116,
        borderRadius: 16,
        overflow: 'hidden',
        background: cam ? 'linear-gradient(135deg,#5a3a22,#26180f)' : '#1a0f08',
        border: '1px solid rgba(255,255,255,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, !cam ? /*#__PURE__*/React.createElement(Icon, {
      n: "video-off",
      size: 22,
      color: "rgba(255,255,255,.5)"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: '#fff'
      }
    }, "Du")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        padding: '18px 0 28px'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Mikrofon",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setMic(!mic)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: mic ? 'mic' : 'mic-off',
      size: 22,
      color: mic ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera",
      variant: "secondary",
      size: "lg",
      shape: "circle",
      onClick: () => setCam(!cam)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: cam ? 'video' : 'video-off',
      size: 22,
      color: cam ? T.strong : 'var(--role-danger)'
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Kamera wechseln",
      variant: "secondary",
      size: "lg",
      shape: "circle"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "switch-camera",
      size: 22,
      color: T.strong
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Verlassen",
      variant: "primary",
      size: "lg",
      shape: "circle",
      onClick: onLeave,
      style: {
        background: 'var(--role-danger)',
        border: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "phone-off",
      size: 22,
      color: "#fff"
    }))));
  }

  /* ── Groups ─────────────────────────────────────────────────────────────── */
  /* iOS inset-grouped list: a white card with hairline separators between rows.
     On Material it preserves each screen's existing look (a filled card, or a
     plain gap-stacked list when materialWrap=false). */
  function GroupedRows({
    items,
    inset = 60,
    materialWrap = true
  }) {
    if (isIOS()) {
      return /*#__PURE__*/React.createElement(Card, {
        padding: 0,
        style: {
          overflow: 'hidden'
        }
      }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, i ? /*#__PURE__*/React.createElement(Divider, {
        inset: inset
      }) : null, it)));
    }
    if (materialWrap) return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '6px 8px'
      }
    }, items);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, items);
  }
  function Groups({
    go,
    primaryAction
  }) {
    const items = D.groups.map(g => /*#__PURE__*/React.createElement(ListItem, {
      key: g.id,
      onClick: () => go({
        push: {
          screen: 'group',
          id: g.id
        }
      }),
      leading: /*#__PURE__*/React.createElement(Avatar, {
        fallback: g.initials,
        alt: g.name,
        size: 44
      }),
      title: g.name,
      subtitle: `${g.members} Mitglieder`,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    }));
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Gruppen",
        action: primaryAction
      }),
      gap: 14
    }, /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 73,
      materialWrap: false
    }));
  }

  /* ── Profile ────────────────────────────────────────────────────────────── */
  function Profile({
    onSignOut
  }) {
    const [notify, setNotify] = React.useState(true);
    const rows = [{
      i: 'user-round',
      l: 'Persönliche Daten',
      a: {
        push: {
          screen: 'preferences'
        }
      }
    }, {
      i: 'bar-chart-3',
      l: 'Berichte',
      a: {
        push: {
          screen: 'reports'
        }
      }
    }, {
      i: 'calendar-cog',
      l: 'Verfügbarkeit verwalten',
      a: {
        push: {
          screen: 'availability'
        }
      }
    }];
    const items = [...rows.map(r => /*#__PURE__*/React.createElement(ListItem, {
      key: r.l,
      onClick: () => r.a && navTo(r.a),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: r.i,
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: r.l,
      trailing: /*#__PURE__*/React.createElement(Icon, {
        n: "chevron-right",
        size: 18,
        color: T.muted
      })
    })), /*#__PURE__*/React.createElement(ListItem, {
      key: "notify",
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "mail",
          size: 20,
          color: T.primaryStrong
        })
      }),
      title: "E-Mail-Benachrichtigungen",
      trailing: /*#__PURE__*/React.createElement(Switch, {
        checked: notify,
        onChange: setNotify,
        ariaLabel: "E-Mail-Benachrichtigungen"
      })
    })];
    return /*#__PURE__*/React.createElement(Screen, {
      header: /*#__PURE__*/React.createElement(TopBar, {
        title: "Profil"
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "accent",
      hero: true,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: D.user.initials,
      alt: D.user.name,
      size: 56,
      shape: "circle"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.01em'
      }
    }, D.user.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        opacity: .9
      }
    }, "Reiterin \xB7 Nord Eventing Academy"))), /*#__PURE__*/React.createElement(GroupedRows, {
      items: items,
      inset: 58
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Abmelden",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "log-out",
        size: 16,
        color: T.strong
      }),
      onClick: onSignOut,
      style: {
        width: '100%'
      }
    }));
  }
  window.StridoScreens = {
    Login,
    Home,
    Videos,
    AssetDetail,
    Sessions,
    Call,
    Groups,
    Profile,
    Icon,
    NavHeader,
    Screen,
    TopBar,
    SectionHeader,
    Bell,
    videoStatus,
    T,
    setNav,
    navTo,
    setPlatform
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/screens2.jsx
try { (() => {
/* Strido mobile UI kit — additional screens (Material You).
 * Augments window.StridoScreens with the pushed/secondary views:
 * Notifications, Upload, BookSession, GroupDetail.
 * Reuses shared helpers (Icon, NavHeader, Screen, T) from screens.jsx.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button),
    IconButton = _w(DS.IconButton),
    Card = _w(DS.Card),
    Chip = _w(DS.Chip),
    Stepper = _w(DS.Stepper),
    SegmentedButton = _w(DS.SegmentedButton),
    Textarea = _w(DS.Textarea),
    TextInput = _w(DS.TextInput),
    ListItem = _w(DS.ListItem),
    Divider = _w(DS.Divider),
    Select = _w(DS.Select),
    Dialog = _w(DS.Dialog),
    Snackbar = _w(DS.Snackbar);
  const {
    Badge,
    Avatar,
    EmptyState,
    IconTile
  } = DS;
  const D = window.StridoData;
  const S = window.StridoScreens;
  const {
    Icon,
    NavHeader,
    T
  } = S;

  /* Full-height pushed-screen shell: fixed nav header + scroll body. */
  function Sheet({
    header,
    children,
    pad = 16,
    gap = 16,
    bottom = 28
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px ${bottom}px`
      }
    }, children)));
  }
  function SecTitle({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, children);
  }

  /* ── Notifications ──────────────────────────────────────────────────────── */
  const NOTIF_ICON = {
    review: 'message-circle',
    invite: 'user-plus',
    booking: 'calendar-check',
    upload: 'check-circle-2',
    system: 'sparkles'
  };
  function NotifRow({
    n,
    onAccept,
    onDecline
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 'var(--radius-tile)',
        background: n.unread ? 'var(--role-surface-1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: n.unread ? 'var(--role-accent-container)' : 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: NOTIF_ICON[n.kind] || 'bell',
      size: 19,
      color: n.unread ? 'var(--role-on-accent-container)' : T.muted,
      sw: 2.2
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: 700,
        color: T.strong
      }
    }, n.title), n.unread ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: 'var(--role-accent)',
        flexShrink: 0
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 3,
        fontSize: 13.5,
        lineHeight: 1.45,
        color: T.muted
      }
    }, n.body), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        fontSize: 12,
        color: T.muted
      }
    }, n.when), n.kind === 'invite' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Annehmen",
      onClick: onAccept,
      style: {
        padding: '8px 18px'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Ablehnen",
      variant: "secondary",
      onClick: onDecline,
      style: {
        padding: '8px 18px'
      }
    })) : null));
  }
  function Notifications({
    onBack
  }) {
    const [filter, setFilter] = React.useState('all');
    const [items, setItems] = React.useState(D.notificationList);
    const list = filter === 'unread' ? items.filter(n => n.unread) : items;
    const today = list.filter(n => n.day === 'today');
    const earlier = list.filter(n => n.day !== 'today');
    const unread = items.filter(n => n.unread).length;
    const markAll = () => setItems(xs => xs.map(n => ({
      ...n,
      unread: false
    })));
    const resolveInvite = id => setItems(xs => xs.filter(n => n.id !== id));
    const right = unread ? /*#__PURE__*/React.createElement("button", {
      onClick: markAll,
      "aria-label": "Alle als gelesen markieren",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check-check",
      size: 22,
      color: T.primaryStrong
    })) : null;
    function Group({
      label,
      rows
    }) {
      if (!rows.length) return null;
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: T.muted,
          padding: '0 4px 6px'
        }
      }, label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }
      }, rows.map(n => /*#__PURE__*/React.createElement(NotifRow, {
        key: n.id,
        n: n,
        onAccept: () => resolveInvite(n.id),
        onDecline: () => resolveInvite(n.id)
      }))));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Benachrichtigungen",
        onBack: onBack,
        right: right
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement(SegmentedButton, {
      activeId: filter,
      onChange: setFilter,
      segments: [{
        id: 'all',
        label: 'Alle'
      }, {
        id: 'unread',
        label: `Ungelesen${unread ? ` (${unread})` : ''}`
      }]
    }), list.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Group, {
      label: "Heute",
      rows: today
    }), /*#__PURE__*/React.createElement(Group, {
      label: "Fr\xFCher",
      rows: earlier
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 40
      }
    }, /*#__PURE__*/React.createElement(EmptyState, {
      title: "Alles gelesen",
      description: "Du bist auf dem neuesten Stand.",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "bell",
        size: 24,
        color: T.primary
      })
    })));
  }

  /* ── Upload (3-step) ────────────────────────────────────────────────────── */
  function Upload({
    onBack
  }) {
    const STEPS = ['files', 'details', 'review'];
    const [step, setStep] = React.useState('files');
    const [picked, setPicked] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [desc, setDesc] = React.useState('');
    const [groupId, setGroupId] = React.useState(D.groups[0].id);
    const idx = STEPS.indexOf(step);
    const stState = s => {
      const i = STEPS.indexOf(s);
      return i < idx ? 'completed' : i === idx ? 'active' : 'upcoming';
    };
    const groupName = D.groups.find(g => g.id === groupId)?.name || '';
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Video hochladen",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement("button", {
          onClick: onBack,
          "aria-label": "Abbrechen",
          style: {
            all: 'unset',
            cursor: 'pointer',
            padding: '0 14px',
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: T.muted
          }
        }, "Abbrechen")
      })
    }, /*#__PURE__*/React.createElement(Stepper, {
      steps: [{
        label: 'Datei',
        state: stState('files')
      }, {
        label: 'Details',
        state: stState('details')
      }, {
        label: 'Hochladen',
        state: stState('review')
      }]
    }), step === 'files' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPicked(true),
      style: {
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '28px 16px',
        borderRadius: 16,
        border: '1.5px dashed var(--role-outline)',
        color: T.muted
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "upload-cloud",
      size: 30,
      color: T.primaryStrong,
      sw: 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: T.strong
      }
    }, "Video ausw\xE4hlen"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5
      }
    }, "MP4 oder MOV \xB7 auch mehrteilig")), picked ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'var(--role-surface-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "file-video",
      size: 18,
      color: T.primaryStrong
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 700,
        color: T.strong,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, "combination-line-2.mp4"), /*#__PURE__*/React.createElement(IconButton, {
      label: "Entfernen",
      variant: "ghost",
      size: "sm",
      onClick: () => setPicked(false)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "x",
      size: 16,
      color: T.muted
    }))) : null, /*#__PURE__*/React.createElement(Button, {
      label: "Weiter",
      disabled: !picked,
      onClick: () => setStep('details'),
      style: {
        alignSelf: 'flex-end'
      }
    })) : null, step === 'details' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 6
      }
    }, "Titel"), /*#__PURE__*/React.createElement(TextInput, {
      value: title,
      onChange: setTitle,
      placeholder: "z. B. Kombination \u2014 Versuch 3"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 6
      }
    }, "Beschreibung"), /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Worauf soll der Coach achten?"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: T.strong,
        marginBottom: 8
      }
    }, "Gruppe"), /*#__PURE__*/React.createElement(Select, {
      value: groupId,
      onChange: setGroupId,
      options: D.groups.map(g => ({
        value: g.id,
        label: g.name
      }))
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Zur\xFCck",
      variant: "secondary",
      onClick: () => setStep('files')
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Weiter",
      onClick: () => setStep('review')
    }))) : null, step === 'review' ? /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'var(--role-accent-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      size: 20,
      color: "var(--role-on-accent-container)",
      sw: 2.6
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, "Bereit zum Hochladen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, "Der Upload l\xE4uft im Hintergrund weiter."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 14,
        borderRadius: 12,
        border: '1px solid var(--role-outline)'
      }
    }, /*#__PURE__*/React.createElement(Row, {
      k: "Titel",
      v: title || '—'
    }), /*#__PURE__*/React.createElement(Row, {
      k: "Gruppe",
      v: groupName
    }), /*#__PURE__*/React.createElement(Row, {
      k: "Dateien",
      v: "1"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Zur\xFCck",
      variant: "secondary",
      onClick: () => setStep('details')
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Upload starten",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "upload",
        size: 16,
        color: "currentColor"
      }),
      onClick: onBack
    }))) : null);
  }
  function Row({
    k,
    v
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: 'var(--role-on-surface)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, k, ": "), v);
  }

  /* ── Book a session — SOTA stepped flow ─────────────────────────────────────
   * Reworked from the old single-scroll accordion (decorative stepper + bare
   * expert chips + global time-chips + buried CTA). Now: one decision per step,
   * the mental order What → Who → When, a working/tappable progress indicator,
   * per-expert availability with a date rail + time grid, and a persistent
   * summary bar that always shows price + selection and carries the one CTA.
   */
  function fmtPrice(n) {
    return `${n} €`;
  }
  function addMins(hhmm, mins) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + mins;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  /* Rich, tappable selection row used for session type + expert. */
  function PickRow({
    selected,
    onClick,
    leading,
    title,
    meta,
    sub,
    trailing
  }) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClick,
      "aria-pressed": selected,
      style: {
        all: 'unset',
        cursor: 'pointer',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 'var(--radius-card)',
        background: selected ? 'var(--role-accent-container)' : 'var(--role-surface-1)',
        color: selected ? 'var(--role-on-accent-container)' : T.strong,
        boxShadow: selected ? 'inset 0 0 0 2px var(--role-accent)' : 'none',
        transition: 'background-color .14s ease, box-shadow .14s ease'
      }
    }, leading, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 15.5,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), meta), sub ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.4,
        color: selected ? 'inherit' : T.muted,
        opacity: selected ? 0.85 : 1,
        marginTop: 3
      }
    }, sub) : null), trailing);
  }
  function Stars({
    rating,
    reviews,
    on
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12.5,
        fontWeight: 700,
        color: on ? 'inherit' : T.strong
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "star",
      size: 13,
      color: "var(--role-warning)",
      sw: 2.4
    }), rating.toFixed(1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: on ? 'inherit' : T.muted,
        opacity: on ? 0.8 : 1
      }
    }, "(", reviews, ")"));
  }
  function BookSession({
    onBack
  }) {
    const C = D.coaching;
    const [step, setStep] = React.useState(1); // 1 Art · 2 Experte · 3 Zeit · 4 Bestätigen
    const [reached, setReached] = React.useState(1);
    const [typeId, setTypeId] = React.useState('');
    const [expertId, setExpertId] = React.useState(''); // '' | 'any' | eN
    const [dayId, setDayId] = React.useState('');
    const [time, setTime] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [booked, setBooked] = React.useState(false);
    const type = C.sessionTypes.find(t => t.id === typeId);

    // Which concrete experts can serve on a given day, and the resolved expert
    // when the rider picked "egal" (first available that day).
    const expertsOnDay = dId => C.experts.filter(e => (C.availability[e.id] || {})[dId]);
    const resolvedExpertId = expertId === 'any' ? dayId ? (expertsOnDay(dayId)[0] || {}).id : C.experts[0].id : expertId;
    const expert = C.experts.find(e => e.id === resolvedExpertId);

    // Availability for the date rail depends on the chosen expert (or "egal" = union).
    const dayHasSlots = dId => expertId === 'any' ? expertsOnDay(dId).length > 0 : !!(C.availability[expertId] || {})[dId];
    const slotsForDay = dId => {
      if (!dId) return [];
      if (expertId === 'any') {
        const all = new Set();
        expertsOnDay(dId).forEach(e => (C.availability[e.id][dId] || []).forEach(t => all.add(t)));
        return [...all].sort();
      }
      return ((C.availability[expertId] || {})[dId] || []).slice().sort();
    };
    const day = C.days.find(d => d.id === dayId);
    const dayTimes = slotsForDay(dayId);
    const goStep = n => {
      setStep(n);
      setReached(r => Math.max(r, n));
    };
    const reset = () => {
      setExpertId('');
      setDayId('');
      setTime('');
    };

    // Per-step gate for the summary-bar CTA.
    const canNext = step === 1 ? !!typeId : step === 2 ? !!expertId : step === 3 ? !!time : true;
    const next = () => {
      if (step < 4) goStep(step + 1);else setBooked(true);
    };
    const smartBack = () => {
      if (step > 1) setStep(step - 1);else onBack();
    };
    const stState = i => i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'upcoming';
    const onStepPress = i => {
      if (i + 1 <= reached) setStep(i + 1);
    };

    /* ---- Confirmation ---- */
    if (booked) {
      return /*#__PURE__*/React.createElement(Sheet, {
        header: /*#__PURE__*/React.createElement(NavHeader, {
          title: "Gebucht"
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
          padding: '52px 20px 16px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 64,
          height: 64,
          borderRadius: 22,
          background: 'var(--role-success-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        size: 32,
        color: "var(--role-on-success-container)",
        sw: 2.8
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 800,
          color: T.strong,
          letterSpacing: '-0.015em'
        }
      }, "Termin best\xE4tigt"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted,
          maxWidth: 290,
          marginTop: 6
        }
      }, "Wir haben dir und ", expert?.name, " eine Best\xE4tigung geschickt. Eine Erinnerung folgt 24 Std vorher.")), /*#__PURE__*/React.createElement(Card, {
        tone: "surface",
        style: {
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        fallback: expert?.initials,
        alt: expert?.name,
        size: 44,
        shape: "circle"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 800,
          color: T.strong
        }
      }, type?.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: T.muted,
          marginTop: 2
        }
      }, day?.dow, " ", day?.date, ". ", day?.month, " \xB7 ", time, "\u2013", addMins(time, type.mins))), /*#__PURE__*/React.createElement(Badge, {
        label: fmtPrice(type.price),
        tone: "primary"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          marginTop: 4
        }
      }, /*#__PURE__*/React.createElement(Button, {
        label: "Zum Kalender hinzuf\xFCgen",
        variant: "secondary",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "calendar-plus",
          size: 16,
          color: T.strong
        }),
        style: {
          width: '100%'
        }
      }), /*#__PURE__*/React.createElement(Button, {
        label: "Fertig",
        onClick: onBack,
        style: {
          width: '100%'
        }
      }))));
    }
    const STEP_LABELS = ['Art', 'Experte', 'Zeit', 'Details'];

    /* ---- Step bodies ---- */
    let bodyContent = null;
    if (step === 1) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Was m\xF6chtest du buchen?"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 12
        }
      }, C.sessionTypes.map(st => /*#__PURE__*/React.createElement(PickRow, {
        key: st.id,
        selected: typeId === st.id,
        onClick: () => {
          setTypeId(st.id);
          reset();
        },
        leading: /*#__PURE__*/React.createElement(IconTile, {
          tone: typeId === st.id ? 'accent' : 'neutral',
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: st.icon,
            size: 20,
            color: typeId === st.id ? 'var(--role-on-accent-container)' : T.primaryStrong
          })
        }),
        title: st.name,
        meta: /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 15,
            fontWeight: 800
          }
        }, fmtPrice(st.price)),
        sub: `${st.mins} Min · ${st.desc}`
      }))));
    } else if (step === 2) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Mit wem?"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 12
        }
      }, /*#__PURE__*/React.createElement(PickRow, {
        selected: expertId === 'any',
        onClick: () => {
          setExpertId('any');
          setDayId('');
          setTime('');
        },
        leading: /*#__PURE__*/React.createElement(IconTile, {
          tone: expertId === 'any' ? 'accent' : 'neutral',
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "sparkles",
            size: 20,
            color: expertId === 'any' ? 'var(--role-on-accent-container)' : T.primaryStrong
          })
        }),
        title: "Erste*r verf\xFCgbare*r",
        sub: "Schnellster Termin \u2014 Trainer*in wird automatisch zugewiesen"
      }), C.experts.map(e => /*#__PURE__*/React.createElement(PickRow, {
        key: e.id,
        selected: expertId === e.id,
        onClick: () => {
          setExpertId(e.id);
          setDayId('');
          setTime('');
        },
        leading: /*#__PURE__*/React.createElement(Avatar, {
          fallback: e.initials,
          alt: e.name,
          size: 44,
          shape: "circle"
        }),
        title: e.name,
        meta: /*#__PURE__*/React.createElement(Stars, {
          rating: e.rating,
          reviews: e.reviews,
          on: expertId === e.id
        }),
        sub: `${e.role} · ${e.specialty}`
      }))));
    } else if (step === 3) {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Wann passt es dir?"), /*#__PURE__*/React.createElement("div", {
        className: "m-scroll",
        style: {
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          margin: '12px -16px 0',
          padding: '0 16px 2px'
        }
      }, C.days.map(d => {
        const avail = dayHasSlots(d.id);
        const sel = dayId === d.id;
        return /*#__PURE__*/React.createElement("button", {
          key: d.id,
          type: "button",
          disabled: !avail,
          onClick: () => {
            setDayId(d.id);
            setTime('');
          },
          style: {
            all: 'unset',
            flexShrink: 0,
            cursor: avail ? 'pointer' : 'not-allowed',
            width: 54,
            padding: '10px 0',
            borderRadius: 16,
            textAlign: 'center',
            background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
            color: sel ? 'var(--role-on-accent)' : avail ? T.strong : T.muted,
            opacity: avail ? 1 : 0.4,
            transition: 'background-color .14s ease'
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            opacity: 0.8
          }
        }, d.isToday ? 'Heute' : d.dow), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 19,
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: 2
          }
        }, d.date), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.75
          }
        }, d.month));
      })), !dayId ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted,
          marginTop: 16,
          padding: '0 2px'
        }
      }, "W\xE4hle zuerst einen Tag.") : dayTimes.length === 0 ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted,
          marginTop: 16
        }
      }, "Keine freien Termine an diesem Tag.") : /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginTop: 16
        }
      }, dayTimes.map(tm => {
        const sel = time === tm;
        return /*#__PURE__*/React.createElement("button", {
          key: tm,
          type: "button",
          onClick: () => setTime(tm),
          style: {
            all: 'unset',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 14.5,
            fontWeight: 700,
            background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
            color: sel ? 'var(--role-on-accent)' : T.strong,
            boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--role-outline)',
            transition: 'background-color .14s ease'
          }
        }, tm);
      })), dayId && dayTimes.length > 0 ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.muted,
          marginTop: 12
        }
      }, "Dauer ", type.mins, " Min", expertId === 'any' ? ' · Trainer*in wird zugewiesen' : '') : null);
    } else {
      bodyContent = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SecTitle, null, "Stimmt das so?"), /*#__PURE__*/React.createElement(Card, {
        tone: "surface",
        style: {
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        }
      }, /*#__PURE__*/React.createElement(SummaryRow, {
        icon: type.icon,
        k: "Session",
        v: `${type.name} · ${type.mins} Min`
      }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SummaryRow, {
        avatar: expert,
        k: expertId === 'any' ? 'Trainer*in (zugewiesen)' : 'Trainer*in',
        v: expert?.name,
        sub: expert?.specialty
      }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(SummaryRow, {
        icon: "calendar-clock",
        k: "Termin",
        v: `${day?.isToday ? 'Heute' : day?.dow} ${day?.date}. ${day?.month}`,
        sub: `${time}–${addMins(time, type.mins)} Uhr`
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 14
        }
      }, /*#__PURE__*/React.createElement(SecTitle, null, "Notiz an die*den Trainer*in"), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 10
        }
      }, /*#__PURE__*/React.createElement(Textarea, {
        value: notes,
        onChange: setNotes,
        rows: 3,
        placeholder: "z. B. Woran m\xF6chtest du arbeiten? (optional)"
      }))));
    }

    /* ---- Summary bar (persistent footer) ---- */
    const ctaLabel = step < 4 ? 'Weiter' : `Buchen · ${fmtPrice(type ? type.price : 0)}`;
    const footer = /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        borderTop: '1px solid var(--role-outline)',
        background: T.bg,
        padding: '12px 16px',
        paddingBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, type ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 17,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, fmtPrice(type.price)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, type.name, expert ? ` · ${expert.name}` : '', time ? ` · ${time}` : '')) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted
      }
    }, "W\xE4hle eine Session-Art")), /*#__PURE__*/React.createElement(Button, {
      label: ctaLabel,
      disabled: !canNext,
      onClick: next,
      style: {
        minWidth: 132
      }
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: "Session buchen",
      onBack: smartBack,
      right: /*#__PURE__*/React.createElement("button", {
        onClick: onBack,
        "aria-label": "Abbrechen",
        style: {
          all: 'unset',
          cursor: 'pointer',
          padding: '0 14px',
          height: 44,
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: T.muted
        }
      }, "Abbrechen")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 8px 14px'
      }
    }, /*#__PURE__*/React.createElement(Stepper, {
      onStepPress: onStepPress,
      steps: STEP_LABELS.map((l, i) => ({
        label: l,
        state: stState(i)
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 16px 20px'
      }
    }, bodyContent)), footer);
  }

  /* Summary line for the confirm step (icon or avatar · label · value · sub). */
  function SummaryRow({
    icon,
    avatar,
    k,
    v,
    sub
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0'
      }
    }, avatar ? /*#__PURE__*/React.createElement(Avatar, {
      fallback: avatar.initials,
      alt: avatar.name,
      size: 38,
      shape: "circle"
    }) : /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      size: 38,
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: icon,
        size: 18,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
      }
    }, k), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong,
        marginTop: 1
      }
    }, v), sub ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted,
        marginTop: 1
      }
    }, sub) : null));
  }

  /* ── Group detail ───────────────────────────────────────────────────────── */
  function MemberRow({
    m
  }) {
    return /*#__PURE__*/React.createElement(ListItem, {
      leading: /*#__PURE__*/React.createElement(Avatar, {
        fallback: m.initials,
        alt: m.name,
        size: 38,
        shape: "circle"
      }),
      title: m.name,
      subtitle: m.role
    });
  }
  function MemberCard({
    icon,
    title,
    count,
    desc,
    members
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: icon,
        size: 19,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, title), /*#__PURE__*/React.createElement(Badge, {
      label: String(count)
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, desc))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, members.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: m.id
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 50
    }) : null, /*#__PURE__*/React.createElement(MemberRow, {
      m: m
    })))));
  }
  function GroupDetail({
    id,
    onBack
  }) {
    const g = D.groups.find(x => x.id === id) || D.groups[0];
    const detail = D.groupMembers[g.id] || {
      desc: '',
      experts: [],
      students: []
    };
    const [leave, setLeave] = React.useState(false);
    const [snack, setSnack] = React.useState(false);
    const settings = /*#__PURE__*/React.createElement("button", {
      "aria-label": "Einstellungen",
      onClick: () => S.navTo({
        push: {
          screen: 'groupPrefs',
          id: g.id
        }
      }),
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "settings",
      size: 22,
      color: T.primaryStrong
    }));
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: g.name,
        onBack: onBack,
        right: settings
      }),
      gap: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      fallback: g.initials,
      alt: g.name,
      size: 56
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 21,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, g.members, " Mitglieder"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 1.5,
        color: T.muted
      }
    }, detail.desc), /*#__PURE__*/React.createElement(Card, {
      tone: "surface"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "qr-code",
        size: 19,
        color: T.primaryStrong
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(SecTitle, null, "Mitglieder einladen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: T.muted,
        marginTop: 2
      }
    }, "Teile einen Link oder QR-Code, um Reiter hinzuzuf\xFCgen."))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        flexShrink: 0,
        borderRadius: 12,
        border: '1px dashed var(--role-outline)',
        background: 'var(--role-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "qr-code",
      size: 40,
      color: T.muted,
      sw: 1.5
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      label: "Link kopieren",
      variant: "tonal",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "copy",
        size: 16,
        color: "var(--role-on-secondary-container)"
      }),
      onClick: () => setSnack(true),
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      label: "QR teilen",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "share-2",
        size: 16,
        color: T.strong
      }),
      style: {
        width: '100%'
      }
    })))), /*#__PURE__*/React.createElement(MemberCard, {
      icon: "award",
      title: "Experten",
      count: detail.experts.length,
      desc: "Trainer, die Videos pr\xFCfen und Coaching anbieten.",
      members: detail.experts
    }), /*#__PURE__*/React.createElement(MemberCard, {
      icon: "users",
      title: "Reiter",
      count: detail.students.length,
      desc: "Mitglieder dieser Gruppe.",
      members: detail.students
    }), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe verlassen",
      variant: "secondary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "log-out",
        size: 16,
        color: "var(--role-danger)"
      }),
      onClick: () => setLeave(true),
      style: {
        width: '100%',
        color: 'var(--role-danger)',
        borderColor: 'var(--role-danger)'
      }
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: leave,
      tone: "danger",
      title: "Gruppe verlassen?",
      description: `Du verlierst den Zugriff auf Videos und Coaching von „${g.name}“.`,
      confirmLabel: "Verlassen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setLeave(false);
        onBack();
      },
      onCancel: () => setLeave(false)
    }), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "Einladungslink kopiert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }
  Object.assign(window.StridoScreens, {
    Notifications,
    Upload,
    BookSession,
    GroupDetail
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/screens2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/screens3.jsx
try { (() => {
/* Strido mobile UI kit — secondary screens, part 3 (Material You ↔ iOS).
 * Adds the five flows the click-through was missing — each one wired to a
 * previously dead-end entry point:
 *   CreateGroup     ← Gruppen → „Gruppe erstellen“
 *   GroupPreferences ← GruppenDetail → Zahnrad
 *   Invite          ← Gruppen → „Gruppe beitreten“ (QR/Code)
 *   Reports         ← Profil → „Berichte“
 *   Availability    ← Profil → „Verfügbarkeit verwalten“
 * Reuses shared helpers (Icon, NavHeader, T) from screens.jsx.
 */
(function () {
  const DS = window.StridoDesignSystem_dc14ef;
  const PlatformState = window.StridoPlatform = window.StridoPlatform || {
    current: 'material'
  };
  const isIOS = () => PlatformState.current === 'ios';
  const _w = C => function Platformed(props) {
    return React.createElement(C, Object.assign({
      platform: PlatformState.current
    }, props));
  };
  const Button = _w(DS.Button),
    IconButton = _w(DS.IconButton),
    Card = _w(DS.Card),
    Chip = _w(DS.Chip),
    Tabs = _w(DS.Tabs),
    TextInput = _w(DS.TextInput),
    Textarea = _w(DS.Textarea),
    Select = _w(DS.Select),
    ListItem = _w(DS.ListItem),
    Divider = _w(DS.Divider),
    Dialog = _w(DS.Dialog),
    Snackbar = _w(DS.Snackbar),
    Switch = _w(DS.Switch),
    FieldLabel = _w(DS.FieldLabel);
  const {
    FieldError,
    Badge,
    Avatar,
    EmptyState,
    IconTile,
    Fab
  } = DS;
  const D = window.StridoData;
  const S = window.StridoScreens;
  const {
    Icon,
    NavHeader,
    T
  } = S;

  /* Full-height pushed-screen shell: fixed nav header + scroll body. */
  function Sheet({
    header,
    children,
    pad = 16,
    gap = 16,
    bottom = 28
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: `${pad}px ${pad}px ${bottom}px`
      }
    }, children)));
  }
  function SecTitle({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, children);
  }
  function CancelBtn({
    onBack
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      "aria-label": "Abbrechen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: T.muted
      }
    }, "Abbrechen");
  }

  /* Round avatar picker (create / edit group). Tappable; toggles a filled state to
     stand in for a chosen image. Pflichtfeld — drives the parent's submit guard. */
  function AvatarInput({
    filled,
    onPick,
    initials = '',
    size = 88
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onPick,
      "aria-label": "Gruppenbild w\xE4hlen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: filled ? 'var(--role-accent-container)' : 'var(--role-surface-2)',
        border: filled ? 'none' : '1.5px dashed var(--role-outline)'
      }
    }, filled ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: size * 0.34,
        fontWeight: 800,
        color: 'var(--role-on-accent-container)'
      }
    }, initials || 'NG') : /*#__PURE__*/React.createElement(Icon, {
      n: "camera",
      size: 26,
      color: T.muted,
      sw: 1.8
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--role-accent)',
        border: '2.5px solid var(--role-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: filled ? 'pencil' : 'plus',
      size: 15,
      color: "var(--role-on-accent)",
      sw: 2.4
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, filled ? 'Bild ändern' : 'Gruppenbild (erforderlich)'));
  }

  /* Reusable labelled field wrapper. */
  function Field({
    label,
    hint,
    error,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(FieldLabel, null, label), children, error ? /*#__PURE__*/React.createElement(FieldError, null, error) : hint ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, hint) : null);
  }

  /* ── Create group ───────────────────────────────────────────────────────── */
  function CreateGroup({
    onBack
  }) {
    const [name, setName] = React.useState('');
    const [avatar, setAvatar] = React.useState(false);
    const [desc, setDesc] = React.useState('');
    const [touched, setTouched] = React.useState(false);
    const nameEmpty = name.trim().length === 0;
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    function submit() {
      setTouched(true);
      if (nameEmpty || !avatar) return;
      onBack();
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe erstellen",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: avatar,
      initials: initials,
      onPick: () => setAvatar(v => !v)
    })), touched && !avatar ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginTop: -8
      }
    }, /*#__PURE__*/React.createElement(FieldError, null, "Ein Gruppenbild ist erforderlich.")) : null, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name",
      error: touched && nameEmpty ? 'Bitte gib einen Namen ein.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "z. B. Nord Eventing Academy",
      invalid: touched && nameEmpty
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung",
      hint: "Optional \u2014 wof\xFCr ist diese Gruppe?"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement(Button, {
      label: "Gruppe erstellen",
      disabled: nameEmpty || !avatar,
      onClick: submit,
      style: {
        width: '100%'
      }
    }));
  }

  /* ── Group preferences (edit + danger zone) ─────────────────────────────── */
  function GroupPreferences({
    id,
    onBack
  }) {
    const g = D.groups.find(x => x.id === id) || D.groups[0];
    const detail = D.groupMembers[g.id] || {
      desc: ''
    };
    const [name, setName] = React.useState(g.name);
    const [desc, setDesc] = React.useState(detail.desc || '');
    const [del, setDel] = React.useState(false);
    const [leave, setLeave] = React.useState(false);
    const [snack, setSnack] = React.useState(false);
    const dirty = name.trim() !== g.name || (desc || '') !== (detail.desc || '');
    const save = /*#__PURE__*/React.createElement("button", {
      onClick: () => dirty && setSnack(true),
      "aria-label": "Speichern",
      disabled: !dirty,
      style: {
        all: 'unset',
        cursor: dirty ? 'pointer' : 'default',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: dirty ? T.primaryStrong : T.muted
      }
    }, "Speichern");
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Einstellungen",
        onBack: onBack,
        right: save
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: true,
      initials: g.initials,
      onPick: () => {}
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "Gruppenname"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      value: desc,
      onChange: setDesc,
      rows: 3,
      placeholder: "Kurzbeschreibung der Gruppe\u2026"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--role-danger)',
        padding: '4px 4px 0'
      }
    }, "Gefahrenzone"), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '4px 8px',
        border: '1px solid var(--role-danger-container)'
      }
    }, /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setLeave(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "log-out",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe verlassen"),
      subtitle: "Du verlierst den Zugriff auf Videos und Coaching."
    }), /*#__PURE__*/React.createElement(Divider, {
      inset: 58
    }), /*#__PURE__*/React.createElement(ListItem, {
      onClick: () => setDel(true),
      leading: /*#__PURE__*/React.createElement(IconTile, {
        tone: "neutral",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "trash-2",
          size: 19,
          color: "var(--role-danger)"
        })
      }),
      title: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--role-danger)',
          fontWeight: 700
        }
      }, "Gruppe l\xF6schen"),
      subtitle: "Endg\xFCltig \u2014 kann nicht r\xFCckg\xE4ngig gemacht werden."
    })), /*#__PURE__*/React.createElement(Dialog, {
      open: leave,
      tone: "danger",
      title: "Gruppe verlassen?",
      description: `Du verlierst den Zugriff auf „${g.name}“.`,
      confirmLabel: "Verlassen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setLeave(false);
        onBack();
      },
      onCancel: () => setLeave(false)
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: del,
      tone: "danger",
      title: "Gruppe l\xF6schen?",
      description: `„${g.name}“ und alle Videos und Sessions werden dauerhaft entfernt.`,
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => {
        setDel(false);
        onBack();
      },
      onCancel: () => setDel(false)
    }), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "\xC4nderungen gespeichert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }

  /* ── Invite (scan QR / enter code → confirm) ────────────────────────────── */
  function Invite({
    onBack
  }) {
    const [code, setCode] = React.useState('');
    const [confirm, setConfirm] = React.useState(null); // group object once a code resolves
    const [bad, setBad] = React.useState(false);
    function lookup(raw) {
      const c = (raw || code).trim().toUpperCase();
      if (c.length < 4) {
        setBad(true);
        return;
      }
      setBad(false);
      // Resolve to a sample group (any code is accepted in the kit).
      setConfirm(D.groups[0]);
    }
    if (confirm) {
      const det = D.groupMembers[confirm.id] || {
        desc: ''
      };
      return /*#__PURE__*/React.createElement(Sheet, {
        header: /*#__PURE__*/React.createElement(NavHeader, {
          title: "Einladung",
          onBack: () => setConfirm(null)
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 8,
          padding: '28px 8px 8px'
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        fallback: confirm.initials,
        alt: confirm.name,
        size: 72
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 21,
          fontWeight: 800,
          color: T.strong,
          letterSpacing: '-0.01em'
        }
      }, confirm.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          color: T.muted
        }
      }, confirm.members, " Mitglieder \xB7 Eingeladen von Coach Petra")), /*#__PURE__*/React.createElement(Card, {
        tone: "surface"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted
        }
      }, det.desc)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        label: "Gruppe beitreten",
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: "check",
          size: 18,
          color: "currentColor",
          sw: 2.4
        }),
        onClick: onBack,
        style: {
          width: '100%'
        }
      }), /*#__PURE__*/React.createElement(Button, {
        label: "Ablehnen",
        variant: "secondary",
        onClick: () => setConfirm(null),
        style: {
          width: '100%'
        }
      })));
    }
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Gruppe beitreten",
        onBack: onBack,
        right: /*#__PURE__*/React.createElement(CancelBtn, {
          onBack: onBack
        })
      }),
      gap: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, #241509 0 14px, #1a0f08 14px 28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 168,
        height: 168,
        borderRadius: 24,
        border: '3px solid rgba(255,255,255,.9)',
        boxShadow: '0 0 0 9999px rgba(0,0,0,.28)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "qr-code",
      size: 22,
      color: "rgba(255,255,255,.9)"
    }), "QR-Code im Rahmen platzieren")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: T.muted
      }
    }, "oder Code eingeben"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--role-outline)'
      }
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Einladungscode",
      error: bad ? 'Code ungültig — bitte prüfen.' : null
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: code,
      onChange: v => {
        setCode(v);
        setBad(false);
      },
      placeholder: "z. B. NEA-2K9",
      invalid: bad
    })), /*#__PURE__*/React.createElement(Button, {
      label: "Beitreten",
      disabled: !code.trim(),
      onClick: () => lookup(),
      style: {
        width: '100%'
      }
    })));
  }

  /* ── Reports (activity summary) ─────────────────────────────────────────── */
  function StatTile({
    icon,
    tone,
    label,
    count,
    footer
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        flex: 1,
        minWidth: 0,
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(IconTile, {
      tone: tone,
      icon: icon
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.02em',
        lineHeight: 1
      }
    }, count), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2
      }
    }, footer));
  }
  function Reports({
    onBack
  }) {
    const R = D.reports;
    const [gran, setGran] = React.useState('month');
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Berichte",
        onBack: onBack
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      activeId: gran,
      onChange: setGran,
      tabs: [{
        id: 'month',
        label: 'Monat'
      }, {
        id: 'quarter',
        label: 'Quartal'
      }, {
        id: 'year',
        label: 'Jahr'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Vorheriger Zeitraum",
      variant: "ghost",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-left",
      size: 20,
      color: T.muted
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: T.strong
      }
    }, R.period), /*#__PURE__*/React.createElement(IconButton, {
      label: "N\xE4chster Zeitraum",
      variant: "ghost",
      size: "sm",
      disabled: true
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "chevron-right",
      size: 20,
      color: "var(--role-outline)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "film",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Videos",
      count: R.videoCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: R.videoDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "video",
        size: 20,
        color: "var(--role-success)"
      }),
      label: "Live-Coaching",
      count: R.liveCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        tone: "success",
        label: R.liveDur
      })
    }), /*#__PURE__*/React.createElement(StatTile, {
      tone: "neutral",
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "users",
        size: 20,
        color: T.primaryStrong
      }),
      label: "Reiter",
      count: R.peopleCount,
      footer: /*#__PURE__*/React.createElement(Badge, {
        label: `in ${R.groupCount} Gruppen`
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: T.strong,
        letterSpacing: '-0.01em'
      }
    }, "Aktivit\xE4t"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Badge, {
      label: `${R.events.length} im ${R.period}`
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, R.events.map(e => {
      const vid = e.kind === 'video';
      return /*#__PURE__*/React.createElement(Card, {
        key: e.id,
        tone: "surface",
        padding: 0,
        style: {
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }
      }, /*#__PURE__*/React.createElement(IconTile, {
        tone: vid ? 'neutral' : 'success',
        icon: /*#__PURE__*/React.createElement(Icon, {
          n: vid ? 'film' : 'video',
          size: 18,
          color: vid ? T.primaryStrong : 'var(--role-success)'
        })
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: T.strong,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          color: T.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, e.who, " \xB7 ", e.group, " \xB7 ", e.date)), /*#__PURE__*/React.createElement(Badge, {
        tone: vid ? 'neutral' : 'success',
        label: e.dur
      }));
    })));
  }

  /* ── Availability (manage session types / schedule / blocked) ───────────────
     Rethought for mobile (Heinrich): the intro card and the full-width add button
     are gone; sections are a single grouped list (hairline dividers, M3 style)
     and the section-aware create action is a Material FAB (iOS → nav-bar "+"). */
  function Availability({
    onBack
  }) {
    const A = D.availability;
    const ios = isIOS();
    const [groupId, setGroupId] = React.useState(D.groups[0].id);
    const [tab, setTab] = React.useState('types');
    const [add, setAdd] = React.useState(null); // which add-dialog is open
    const [del, setDel] = React.useState(null); // pending delete label
    const [fullDay, setFullDay] = React.useState(true);
    function rows() {
      if (tab === 'types') return A.sessionTypes.map(st => ({
        key: st.id,
        del: st.name,
        edit: () => setAdd('types'),
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            flex: '0 1 auto',
            minWidth: 0,
            fontSize: 15,
            fontWeight: 700,
            color: T.strong,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        }, st.name), /*#__PURE__*/React.createElement("span", {
          style: {
            flexShrink: 0
          }
        }, /*#__PURE__*/React.createElement(Badge, {
          tone: "primary",
          label: `${st.mins} Min`
        }))), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 3,
            lineHeight: 1.4
          }
        }, st.desc))
      }));
      if (tab === 'schedule') return A.schedule.map(s => ({
        key: s.id,
        del: s.day,
        edit: () => setAdd('schedule'),
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement(IconTile, {
          tone: "neutral",
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "calendar",
            size: 18,
            color: T.primaryStrong
          })
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 15,
            fontWeight: 700,
            color: T.strong
          }
        }, s.day), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 1
          }
        }, s.from, " \u2013 ", s.to)))
      }));
      return A.blocked.map(b => ({
        key: b.id,
        del: b.date,
        edit: null,
        node: /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement(IconTile, {
          tone: "neutral",
          icon: /*#__PURE__*/React.createElement(Icon, {
            n: "calendar-off",
            size: 18,
            color: "var(--role-danger)"
          })
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 15,
            fontWeight: 700,
            color: T.strong
          }
        }, b.date), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            color: T.muted,
            marginTop: 1
          }
        }, b.range, b.reason ? ` · ${b.reason}` : '')))
      }));
    }
    const list = rows();
    const addAtTab = /*#__PURE__*/React.createElement("button", {
      onClick: () => setAdd(tab),
      "aria-label": "Hinzuf\xFCgen",
      style: {
        all: 'unset',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--role-accent)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "plus",
      size: 24,
      color: "var(--role-accent)",
      sw: 2.4
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.strong
      }
    }, /*#__PURE__*/React.createElement(NavHeader, {
      title: "Verf\xFCgbarkeit",
      onBack: onBack,
      right: ios ? addAtTab : null
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-scroll",
      style: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '12px 16px 104px'
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Gruppe"
    }, /*#__PURE__*/React.createElement(Select, {
      value: groupId,
      onChange: setGroupId,
      options: D.groups.map(g => ({
        value: g.id,
        label: g.name
      }))
    })), /*#__PURE__*/React.createElement(Tabs, {
      activeId: tab,
      onChange: setTab,
      tabs: [{
        id: 'types',
        label: 'Session-Typen'
      }, {
        id: 'schedule',
        label: 'Wochenplan'
      }, {
        id: 'blocked',
        label: 'Geblockt'
      }]
    }), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '2px 6px'
      }
    }, list.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.key
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 16
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 6px 10px 10px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, r.node), r.edit ? /*#__PURE__*/React.createElement(IconButton, {
      label: "Bearbeiten",
      variant: "ghost",
      size: "sm",
      onClick: r.edit
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pencil",
      size: 17,
      color: T.muted
    })) : null, /*#__PURE__*/React.createElement(IconButton, {
      label: "L\xF6schen",
      variant: "ghost",
      size: "sm",
      onClick: () => setDel(r.del)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash-2",
      size: 17,
      color: "var(--role-danger)"
    })))))))), !ios ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        zIndex: 30
      }
    }, /*#__PURE__*/React.createElement(Fab, {
      extended: true,
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "plus",
        size: 20,
        color: "var(--role-on-accent)",
        sw: 2.4
      }),
      label: "Hinzuf\xFCgen",
      onClick: () => setAdd(tab)
    })) : null, /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'types',
      title: "Session-Typ",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Video-Review"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Dauer"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "30",
      options: [{
        value: '30',
        label: '30 Minuten'
      }, {
        value: '45',
        label: '45 Minuten'
      }, {
        value: '60',
        label: '60 Minuten'
      }]
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Beschreibung"
    }, /*#__PURE__*/React.createElement(Textarea, {
      rows: 2,
      placeholder: "Was umfasst diese Session?"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'schedule',
      title: "Zeitfenster",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Wochentag"
    }, /*#__PURE__*/React.createElement(Select, {
      value: "mon",
      options: [{
        value: 'mon',
        label: 'Montag'
      }, {
        value: 'tue',
        label: 'Dienstag'
      }, {
        value: 'wed',
        label: 'Mittwoch'
      }, {
        value: 'thu',
        label: 'Donnerstag'
      }, {
        value: 'fri',
        label: 'Freitag'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Von"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "16:00"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Bis"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "19:00"
    })))))), /*#__PURE__*/React.createElement(Dialog, {
      open: add === 'blocked',
      title: "Tag blockieren",
      confirmLabel: "Speichern",
      cancelLabel: "Abbrechen",
      onConfirm: () => setAdd(null),
      onCancel: () => setAdd(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Datum"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "Fr 27 Jun"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        color: T.strong
      }
    }, "Ganzer Tag"), /*#__PURE__*/React.createElement(Switch, {
      checked: fullDay,
      onChange: setFullDay,
      ariaLabel: "Ganzer Tag"
    })), !fullDay ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Von"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "14:00"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Bis"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "17:00"
    })))) : null, /*#__PURE__*/React.createElement(Field, {
      label: "Grund",
      hint: "Optional"
    }, /*#__PURE__*/React.createElement(TextInput, {
      placeholder: "z. B. Turnier"
    })))), /*#__PURE__*/React.createElement(Dialog, {
      open: !!del,
      tone: "danger",
      title: "Wirklich l\xF6schen?",
      description: del ? `„${del}“ wird entfernt.` : '',
      confirmLabel: "L\xF6schen",
      cancelLabel: "Abbrechen",
      onConfirm: () => setDel(null),
      onCancel: () => setDel(null)
    }));
  }

  /* ── Preferences (personal data + email prefs) — the Profil → „Persönliche
     Daten“ destination, mirroring the app's profile preferences. ─────────────── */
  function Preferences({
    onBack
  }) {
    const u = D.user;
    const [name, setName] = React.useState(u.name);
    const [lang, setLang] = React.useState(u.language);
    const [tz, setTz] = React.useState(u.timezone);
    const [prefs, setPrefs] = React.useState({
      feedback: true,
      bookings: true,
      invites: false
    });
    const [snack, setSnack] = React.useState(false);
    const toggle = k => setPrefs(p => ({
      ...p,
      [k]: !p[k]
    }));
    const save = /*#__PURE__*/React.createElement("button", {
      onClick: () => setSnack(true),
      "aria-label": "Speichern",
      style: {
        all: 'unset',
        cursor: 'pointer',
        padding: '0 14px',
        height: 44,
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: T.primaryStrong
      }
    }, "Speichern");
    const NOTES = [{
      k: 'feedback',
      l: 'Neues Feedback',
      d: 'Wenn ein Experte dein Video kommentiert.'
    }, {
      k: 'bookings',
      l: 'Buchungsbestätigungen',
      d: 'Bestätigungen und Erinnerungen.'
    }, {
      k: 'invites',
      l: 'Gruppeneinladungen',
      d: 'Einladungen in neue Gruppen.'
    }];
    return /*#__PURE__*/React.createElement(Sheet, {
      header: /*#__PURE__*/React.createElement(NavHeader, {
        title: "Pers\xF6nliche Daten",
        onBack: onBack,
        right: save
      }),
      gap: 18
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement(AvatarInput, {
      filled: true,
      initials: u.initials,
      onPick: () => {}
    })), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "Name"
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: name,
      onChange: setName,
      placeholder: "Dein Name"
    })), /*#__PURE__*/React.createElement(Field, {
      label: "E-Mail",
      hint: "Wird f\xFCr die Anmeldung verwendet."
    }, /*#__PURE__*/React.createElement(TextInput, {
      value: u.email,
      onChange: () => {},
      disabled: true
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Sprache"
    }, /*#__PURE__*/React.createElement(Select, {
      value: lang,
      onChange: setLang,
      options: [{
        value: 'de',
        label: 'Deutsch'
      }, {
        value: 'en',
        label: 'English'
      }, {
        value: 'fr',
        label: 'Français'
      }]
    })), /*#__PURE__*/React.createElement(Field, {
      label: "Zeitzone"
    }, /*#__PURE__*/React.createElement(Select, {
      value: tz,
      onChange: setTz,
      options: [{
        value: 'Europe/Berlin',
        label: 'Berlin (MEZ)'
      }, {
        value: 'Europe/London',
        label: 'London (GMT)'
      }, {
        value: 'Europe/Zurich',
        label: 'Zürich (MEZ)'
      }, {
        value: 'America/New_York',
        label: 'New York (EST)'
      }, {
        value: 'Asia/Tokyo',
        label: 'Tokio (JST)'
      }]
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: T.muted,
        padding: '4px 4px 0'
      }
    }, "E-Mail-Benachrichtigungen"), /*#__PURE__*/React.createElement(Card, {
      tone: "surface",
      padding: 0,
      style: {
        padding: '2px 6px'
      }
    }, NOTES.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.k
    }, i ? /*#__PURE__*/React.createElement(Divider, {
      inset: 16
    }) : null, /*#__PURE__*/React.createElement(ListItem, {
      title: r.l,
      subtitle: r.d,
      trailing: /*#__PURE__*/React.createElement(Switch, {
        checked: prefs[r.k],
        onChange: () => toggle(r.k),
        ariaLabel: r.l
      })
    })))), /*#__PURE__*/React.createElement(Snackbar, {
      open: snack,
      tone: "success",
      message: "Profil gespeichert.",
      actionLabel: "OK",
      onAction: () => setSnack(false)
    }));
  }
  Object.assign(window.StridoScreens, {
    CreateGroup,
    GroupPreferences,
    Invite,
    Reports,
    Availability,
    Preferences
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/screens3.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Fab = __ds_scope.Fab;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.IconTile = __ds_scope.IconTile;

__ds_ns.ListItem = __ds_scope.ListItem;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Snackbar = __ds_scope.Snackbar;

__ds_ns.FieldLabel = __ds_scope.FieldLabel;

__ds_ns.FieldError = __ds_scope.FieldError;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.LargeTitleBar = __ds_scope.LargeTitleBar;

__ds_ns.NavigationBar = __ds_scope.NavigationBar;

__ds_ns.SegmentedButton = __ds_scope.SegmentedButton;

__ds_ns.Stepper = __ds_scope.Stepper;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopAppBar = __ds_scope.TopAppBar;

})();
