import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { translateDom } from './i18n.mjs';

test('replaces known text and preserves surrounding whitespace', () => {
  const $ = cheerio.load('<p>\n  Funktionen\n</p>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.equal($('p').text(), '\n  Features\n');
});

test('unknown text falls back to German (unchanged)', () => {
  const $ = cheerio.load('<p>Unbekannt</p>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.equal($('p').text(), 'Unbekannt');
});

test('does not touch script/style contents', () => {
  const $ = cheerio.load('<script>var Funktionen = 1;</script>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.match($('script').html(), /Funktionen/);
});

test('translates whitelisted attributes', () => {
  const $ = cheerio.load('<input placeholder="Kommentar hinzufügen…">');
  translateDom($, { 'Kommentar hinzufügen…': 'Add a comment…' });
  assert.equal($('input').attr('placeholder'), 'Add a comment…');
});
