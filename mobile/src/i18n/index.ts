import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const SUPPORTED = ['en', 'de', 'fr'] as const;

export function deviceLanguage(): string {
  const candidate = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED as readonly string[]).includes(candidate) ? candidate : 'en';
}

export async function initI18n(lng: string = deviceLanguage()) {
  if (!i18next.isInitialized) {
    await i18next.use(initReactI18next).init({
      lng,
      fallbackLng: 'en',
      resources: { en: { translation: en }, de: { translation: de }, fr: { translation: fr } },
      interpolation: { escapeValue: false },
    });
  }
  return i18next;
}
