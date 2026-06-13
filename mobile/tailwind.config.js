/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};
