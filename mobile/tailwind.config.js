/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Legacy flat tokens (kept for un-migrated screens — do not remove) ──
        'z-bg': 'var(--z-bg)',
        'z-surface': 'var(--z-surface)',
        'z-surface-warm': 'var(--z-surface-warm)',
        'z-surface-muted': 'var(--z-surface-muted)',
        'z-text': 'var(--z-text)',
        'z-muted': 'var(--z-muted)',
        'z-primary': 'var(--z-primary)',
        'z-primary-strong': 'var(--z-primary-strong)',
        'z-primary-soft': 'var(--z-primary-soft)',
        'z-accent': 'var(--z-accent)',
        'z-border': 'var(--z-border)',
        'z-success': 'var(--z-success)',
        'z-success-soft': 'var(--z-success-soft)',
        'z-warning': 'var(--z-warning)',
        'z-warning-soft': 'var(--z-warning-soft)',
        'z-danger': 'var(--z-danger)',
        'z-danger-soft': 'var(--z-danger-soft)',
        // ── Semantic role tokens (light+dark via CSS vars) ────────────────────
        // Brand accent: bg-accent / text-on-accent / bg-accent-container etc.
        'accent': 'var(--role-accent)',
        'on-accent': 'var(--role-on-accent)',
        'accent-container': 'var(--role-accent-container)',
        'on-accent-container': 'var(--role-on-accent-container)',
        'secondary-container': 'var(--role-secondary-container)',
        'on-secondary-container': 'var(--role-on-secondary-container)',
        // Status
        'role-success': 'var(--role-success)',
        'on-success': 'var(--role-on-success)',
        'success-container': 'var(--role-success-container)',
        'on-success-container': 'var(--role-on-success-container)',
        'role-warning': 'var(--role-warning)',
        'on-warning': 'var(--role-on-warning)',
        'warning-container': 'var(--role-warning-container)',
        'on-warning-container': 'var(--role-on-warning-container)',
        'role-danger': 'var(--role-danger)',
        'on-danger': 'var(--role-on-danger)',
        'danger-container': 'var(--role-danger-container)',
        'on-danger-container': 'var(--role-on-danger-container)',
        // Surfaces: bg-surface / bg-surface-variant / bg-background
        'background': 'var(--role-background)',
        'surface': 'var(--role-surface)',
        'surface-variant': 'var(--role-surface-variant)',
        'surface-1': 'var(--role-surface-1)',
        'surface-2': 'var(--role-surface-2)',
        'surface-3': 'var(--role-surface-3)',
        'surface-4': 'var(--role-surface-4)',
        // Text hierarchy: text-on-surface / text-on-surface-variant
        'on-surface': 'var(--role-on-surface)',
        'on-surface-variant': 'var(--role-on-surface-variant)',
        // Border / divider: border-outline
        'outline': 'var(--role-outline)',
      },
    },
  },
  plugins: [],
};
