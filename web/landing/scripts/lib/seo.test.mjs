import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap, buildRobots } from './seo.mjs';

test('sitemap lists all 25 pages with hreflang alternates', () => {
  const xml = buildSitemap();
  assert.equal((xml.match(/<loc>/g) || []).length, 25); // (1 landing + 4 legal) x 5 locales
  assert.match(xml, /<loc>https:\/\/strido\.net\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/strido\.net\/es\/terms\.html<\/loc>/);
  assert.match(xml, /hreflang="x-default"/);
});

test('robots references the sitemap', () => {
  const txt = buildRobots();
  assert.match(txt, /Sitemap: https:\/\/strido\.net\/sitemap\.xml/);
  assert.match(txt, /Allow: \//);
});
