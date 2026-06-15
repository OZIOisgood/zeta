import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, DEFAULT_LOCALE, LEGAL_SLUGS, SITE_ORIGIN } from './config.mjs';

test('locales: 5 entries, de is default with empty dir', () => {
  assert.equal(LOCALES.length, 5);
  assert.deepEqual(LOCALES.map(l => l.code), ['de', 'en', 'fr', 'nl', 'es']);
  assert.equal(DEFAULT_LOCALE, 'de');
  assert.equal(LOCALES.find(l => l.code === 'de').dir, '');
  assert.equal(LOCALES.find(l => l.code === 'en').dir, 'en');
  assert.equal(LOCALES.find(l => l.code === 'en').flag, 'gb');
});

test('legal slugs and origin', () => {
  assert.deepEqual(LEGAL_SLUGS, ['imprint', 'privacy', 'contact', 'terms']);
  assert.equal(SITE_ORIGIN, 'https://strido.net');
});
