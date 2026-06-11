jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from './index';

test('resolves translations for all supported languages', async () => {
  const i18n = await initI18n('en');
  expect(i18n.isInitialized).toBe(true);
  for (const lng of ['en', 'de', 'fr']) {
    await i18n.changeLanguage(lng);
    expect(i18n.t('common.nav.videos')).not.toBe('common.nav.videos');
    expect(i18n.t('common.nav.videos')).not.toBe('');
  }
});
