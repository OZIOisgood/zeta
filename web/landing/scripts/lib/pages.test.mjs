import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { localePath, absoluteUrl, headLinks, rewriteLinks, applySwitcher, buildLandingPage, rewriteLegalLinks, buildContactForm, buildContactCard } from './pages.mjs';

test('localePath: de at root, others prefixed; index vs slug', () => {
  assert.equal(localePath('de', 'index'), '/');
  assert.equal(localePath('en', 'index'), '/en/');
  assert.equal(localePath('de', 'imprint'), '/imprint.html');
  assert.equal(localePath('fr', 'imprint'), '/fr/imprint.html');
});

test('absoluteUrl prepends origin', () => {
  assert.equal(absoluteUrl('es', 'privacy'), 'https://strido.net/es/privacy.html');
});

test('headLinks has canonical + 5 alternates + x-default', () => {
  const html = headLinks('en', 'index');
  assert.match(html, /rel="canonical" href="https:\/\/strido\.net\/en\/"/);
  assert.equal((html.match(/hreflang=/g) || []).length, 6); // 5 locales + x-default
  assert.match(html, /hreflang="x-default" href="https:\/\/strido\.net\/"/);
});

test('rewriteLinks prefixes internal root links for non-de, skips assets', () => {
  const $ = cheerio.load('<a href="/imprint.html">x</a><a href="/#funktionen">y</a><a href="/assets/site.js">z</a>');
  rewriteLinks($, 'fr');
  assert.equal($('a').eq(0).attr('href'), '/fr/imprint.html');
  assert.equal($('a').eq(1).attr('href'), '/fr/#funktionen');
  assert.equal($('a').eq(2).attr('href'), '/assets/site.js');
});

test('applySwitcher sets current label and option links for the page', () => {
  const $ = cheerio.load('<div data-lang-switcher><span data-lang-current></span><div data-lang-menu></div></div>');
  applySwitcher($, 'en', 'imprint');
  assert.equal($('[data-lang-current]').text(), 'EN');
  assert.equal($('[data-lang-menu] a').length, 5);
  assert.equal($('[data-lang-menu] a[hreflang="de"]').attr('href'), '/imprint.html');
  assert.equal($('[data-lang-menu] a[hreflang="es"]').attr('href'), '/es/imprint.html');
  assert.match($('[data-lang-menu] a[hreflang="en"]').html(), /flags\/gb\.svg/); // English uses the GB flag
  assert.match($('[data-lang-menu] a[hreflang="de"]').html(), /flags\/de\.svg/);
});

test('rewriteLegalLinks maps localized legal slugs (and contact-form URLs) to canonical .html', () => {
  const $ = cheerio.load('<article data-legal-content><a href="/privacidad">p</a><a href="https://strido.net/contacto">c</a><a href="/aviso-legal">i</a><a href="/datenschutz">d</a></article>');
  rewriteLegalLinks($);
  assert.equal($('a').eq(0).attr('href'), '/privacy.html');
  assert.equal($('a').eq(1).attr('href'), '/contact.html');
  assert.equal($('a').eq(2).attr('href'), '/imprint.html');
  assert.equal($('a').eq(3).attr('href'), '/privacy.html');
});

test('buildContactForm renders a non-wired form with consent checkbox', () => {
  const out = buildContactForm({ 'Nachricht senden': 'Send message', 'Dein Name': 'Your name', 'Name': 'Name' });
  assert.match(out, /<form class="contact-form" onsubmit="return false;">/);
  assert.match(out, />Send message</);
  assert.match(out, /placeholder="Your name"/);
  assert.match(out, /<textarea/);
  assert.match(out, /type="checkbox"/);
  assert.match(out, /href="\/datenschutz"/); // privacy link (rewritten to /privacy.html at build)
});

test('buildContactCard renders an email card with a mailto link', () => {
  const out = buildContactCard({ 'E-Mail': 'Email' }, 'support@strido.net');
  assert.match(out, /contact-channel/);
  assert.match(out, />Email</);
  assert.match(out, /mailto:support@strido\.net/);
});

test('buildLandingPage sets lang and translates body for non-de', () => {
  const tpl = '<!doctype html><html lang="de"><head><title>t</title><meta name="description" content="d"></head><body data-bg-rhythm="ruhig"><nav><a href="/#funktionen">Funktionen</a></nav><div data-lang-switcher><span data-lang-current></span><div data-lang-menu></div></div></body></html>';
  const out = buildLandingPage({ templateHtml: tpl, dict: { 'Funktionen': 'Features' }, locale: 'en', meta: { index: { title: 'T', description: 'D' } } });
  assert.match(out, /<html lang="en"/);
  assert.match(out, />Features</);
  assert.match(out, /rel="canonical" href="https:\/\/strido\.net\/en\/"/);
});
