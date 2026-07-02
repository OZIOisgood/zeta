/* Strido — Material 3 / Material You token sets for the Android home redesign.
 * Four schemes: ember-orange (brand) and a neutral native-Material indigo,
 * each in light & dark. Each entry maps the --m-* role tokens consumed by
 * material-home.jsx. Plain script: assigns window.MThemes.
 */
window.MThemes = {
  /* ── Ember orange — derived Material tonal palette from Strido #ea580c ── */
  'orange-light': {
    label: 'Orange', sub: 'Light · brand ember', dark: false,
    vars: {
      '--m-bg': '#fff8f4', '--m-surface': '#fff8f4',
      '--m-s1': '#fdf1ea', '--m-s2': '#faece2', '--m-s3': '#f5e6db', '--m-s4': '#efe0d4',
      '--m-on-surface': '#221a15', '--m-on-surface-variant': '#54443b',
      '--m-outline': '#897668', '--m-outline-variant': '#d8c3b6',
      '--m-primary': '#bd4309', '--m-on-primary': '#ffffff',
      '--m-primary-container': '#ffdbc8', '--m-on-primary-container': '#3a1400',
      '--m-secondary-container': '#ffdcc4', '--m-on-secondary-container': '#5a3214',
      '--m-success': '#15803d', '--m-success-container': '#c7f1d2', '--m-on-success-container': '#05351a',
      '--m-nav': '#faece2', '--m-shadow': 'rgba(73,38,12,.20)',
    },
  },
  'orange-dark': {
    label: 'Orange', sub: 'Dark · brand ember', dark: true,
    vars: {
      '--m-bg': '#18120d', '--m-surface': '#18120d',
      '--m-s1': '#1f160f', '--m-s2': '#261c14', '--m-s3': '#31271d', '--m-s4': '#3c3026',
      '--m-on-surface': '#f2dfd2', '--m-on-surface-variant': '#d8c3b6',
      '--m-outline': '#a18d80', '--m-outline-variant': '#54443b',
      '--m-primary': '#ffb68f', '--m-on-primary': '#522300',
      '--m-primary-container': '#7c3500', '--m-on-primary-container': '#ffdbc8',
      '--m-secondary-container': '#5d4030', '--m-on-secondary-container': '#ffdcc4',
      '--m-success': '#7fd99a', '--m-success-container': '#1f4a30', '--m-on-success-container': '#c7f1d2',
      '--m-nav': '#211913', '--m-shadow': 'rgba(0,0,0,.45)',
    },
  },
  /* ── Neutral — native-Material indigo on cool greys ───────────────────── */
  'neutral-light': {
    label: 'Neutral', sub: 'Light · indigo accent', dark: false,
    vars: {
      '--m-bg': '#fbf8ff', '--m-surface': '#fbf8ff',
      '--m-s1': '#f3f2fb', '--m-s2': '#edecf5', '--m-s3': '#e7e6ef', '--m-s4': '#e1e0e9',
      '--m-on-surface': '#1b1b21', '--m-on-surface-variant': '#45464f',
      '--m-outline': '#76767f', '--m-outline-variant': '#c6c5d0',
      '--m-primary': '#4a5bd0', '--m-on-primary': '#ffffff',
      '--m-primary-container': '#dfe0ff', '--m-on-primary-container': '#001257',
      '--m-secondary-container': '#e1e0f9', '--m-on-secondary-container': '#191a2c',
      '--m-success': '#2e6c43', '--m-success-container': '#b2f1c2', '--m-on-success-container': '#00210f',
      '--m-nav': '#edecf5', '--m-shadow': 'rgba(20,22,40,.18)',
    },
  },
  'neutral-dark': {
    label: 'Neutral', sub: 'Dark · indigo accent', dark: true,
    vars: {
      '--m-bg': '#121318', '--m-surface': '#121318',
      '--m-s1': '#1b1b21', '--m-s2': '#1f2026', '--m-s3': '#2a2a31', '--m-s4': '#34343b',
      '--m-on-surface': '#e4e1e9', '--m-on-surface-variant': '#c6c5d0',
      '--m-outline': '#90909a', '--m-outline-variant': '#45464f',
      '--m-primary': '#bdc2ff', '--m-on-primary': '#1a2678',
      '--m-primary-container': '#323f8f', '--m-on-primary-container': '#dfe0ff',
      '--m-secondary-container': '#43444f', '--m-on-secondary-container': '#e1e0f9',
      '--m-success': '#94d5a4', '--m-success-container': '#14512a', '--m-on-success-container': '#b2f1c2',
      '--m-nav': '#1f2026', '--m-shadow': 'rgba(0,0,0,.5)',
    },
  },
};
