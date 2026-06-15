import * as cheerio from 'cheerio';
import { LOCALES, DEFAULT_LOCALE, SITE_ORIGIN, LEGAL_SLUG_ALIASES } from './config.mjs';
import { translateDom } from './i18n.mjs';

const dirOf = (locale) => LOCALES.find((l) => l.code === locale).dir;

export function localePath(locale, pageKey) {
  const d = dirOf(locale);
  const prefix = d ? `/${d}` : '';
  return pageKey === 'index' ? `${prefix}/` : `${prefix}/${pageKey}.html`;
}

export function absoluteUrl(locale, pageKey) {
  return `${SITE_ORIGIN}${localePath(locale, pageKey)}`;
}

export function headLinks(locale, pageKey) {
  const lines = [`<link rel="canonical" href="${absoluteUrl(locale, pageKey)}">`];
  for (const l of LOCALES) lines.push(`<link rel="alternate" hreflang="${l.code}" href="${absoluteUrl(l.code, pageKey)}">`);
  lines.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(DEFAULT_LOCALE, pageKey)}">`);
  return lines.join('\n');
}

export function rewriteLinks($, locale) {
  const d = dirOf(locale);
  if (!d) return;
  $('a[href^="/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href.startsWith('/assets/')) return;
    $(el).attr('href', `/${d}${href}`);
  });
}

const flagImg = (flag) => `<img class="lp-lang-flag" src="/assets/flags/${flag}.svg" alt="" aria-hidden="true" width="18" height="13">`;

export function applySwitcher($, locale, pageKey) {
  const cur = LOCALES.find((l) => l.code === locale);
  $('[data-lang-current]').text(cur.short);
  $('[data-lang-flag]').html(flagImg(cur.flag));
  const menu = $('[data-lang-menu]');
  menu.empty();
  for (const l of LOCALES) {
    const active = l.code === locale;
    menu.append(
      `<a class="lp-lang-option" role="option" href="${localePath(l.code, pageKey)}" hreflang="${l.code}"${active ? ' aria-selected="true"' : ''}>` +
        `${flagImg(l.flag)}<span class="lp-lang-name">${l.label}</span>` +
        `<span class="lp-lang-check"><i data-lucide="check"></i></span></a>`,
    );
  }
}

export function applyHead($, { locale, pageKey, title, description }) {
  $('html').attr('lang', locale);
  $('title').text(title);
  if (!$('meta[name="description"]').length) $('head').append('<meta name="description" content="">');
  $('meta[name="description"]').attr('content', description);
  $('head').append('\n' + headLinks(locale, pageKey));
}

export function buildLandingPage({ templateHtml, dict, locale, meta }) {
  const $ = cheerio.load(templateHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);
  rewriteLinks($, locale);
  applySwitcher($, locale, 'index');
  applyHead($, { locale, pageKey: 'index', title: meta.index.title, description: meta.index.description });
  return $.html();
}

// Inside rendered legal content, map localized slug links (and absolute contact-form URLs)
// to our canonical /{slug}.html; rewriteLinks() then adds the locale prefix.
export function rewriteLegalLinks($) {
  $('[data-legal-content] a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/\/([a-z-]+)(?:[/?#].*)?$/i);
    const seg = m && m[1].toLowerCase();
    if (seg && Object.prototype.hasOwnProperty.call(LEGAL_SLUG_ALIASES, seg)) {
      $(el).attr('href', `/${LEGAL_SLUG_ALIASES[seg]}.html`);
    }
  });
}

// Non-wired demo contact form (matches the handoff), with strings translated via the dict.
// Actual submission (backend) is a go-live task.
export function buildContactCard(dict, email) {
  const t = (k) => dict[k] || k;
  return (
    '<div class="contact-channels"><div class="contact-channel">' +
    '<span class="legal-li-icon"><i data-lucide="mail"></i></span>' +
    `<div><h3>${t('E-Mail')}</h3><p><a href="mailto:${email}">${email}</a></p></div>` +
    '</div></div>'
  );
}

export function buildContactForm(dict) {
  const t = (k) => dict[k] || k;
  const attr = (k) => t(k).replace(/"/g, '&quot;');
  // Canonical /privacy.html (not the localized /datenschutz slug): the form is appended to
  // .legal-main, outside rewriteLegalLinks' [data-legal-content] scope, so only rewriteLinks
  // (locale prefix) runs on it.
  const consent = t('Ich habe die {link} gelesen und verstanden.')
    .replace('{link}', `<a href="/privacy.html">${t('Datenschutzerklärung')}</a>`);
  return (
    '<form class="contact-form" onsubmit="return false;">' +
    `<h2>${t('Nachricht senden')}</h2>` +
    `<div class="contact-field"><label for="cf-name">${t('Name')}</label>` +
    `<input id="cf-name" type="text" placeholder="${attr('Dein Name')}" autocomplete="name"></div>` +
    `<div class="contact-field"><label for="cf-email">${t('E-Mail')}</label>` +
    `<input id="cf-email" type="email" placeholder="${attr('du@beispiel.de')}" autocomplete="email"></div>` +
    `<div class="contact-field"><label for="cf-msg">${t('Nachricht')}</label>` +
    `<textarea id="cf-msg" placeholder="${attr('Wie können wir helfen?')}"></textarea></div>` +
    `<label class="contact-consent"><input type="checkbox" required> <span>${consent}</span></label>` +
    `<button class="lp-btn lp-btn-primary" type="submit">${t('Nachricht senden')}</button>` +
    `<p class="contact-form-note">${t('Demo-Formular — wird noch nicht versendet.')}</p>` +
    '</form>'
  );
}

// Impressum/Imprint provider-data card (§ 5 DDG). Values come from content/legal/values.json;
// labels are translated via the chrome dict. Mirrors the handoff's carded definition list,
// adapted to a GbR (no commercial-register / VAT-ID rows — those don't apply to us).
export function buildImprintCard(dict, v) {
  const t = (k) => dict[k] || k;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = [
    [t('Diensteanbieter'), `${esc(v.GBR_BEZEICHNUNG)} (GbR)`],
    [t('Vertretung'), `${esc(v.NAME_1)}, ${esc(v.NAME_2)}`],
    [t('Anschrift'), esc(v.ANSCHRIFT).replace(/\s*\|\s*/g, '<br>')],
    [t('Kontakt'), `<a href="mailto:${esc(v.EMAIL)}">${esc(v.EMAIL)}</a>`],
  ];
  const dl = rows.map(([k, val]) => `<dt>${k}</dt><dd>${val}</dd>`).join('');
  return `<p class="legal-card-caption">${t('Angaben gemäß § 5 DDG')}</p><div class="legal-card"><dl>${dl}</dl></div>`;
}

export function buildLegalPage({ shellHtml, contentHtml, h1, locale, slug, description, dict, values }) {
  const $ = cheerio.load(shellHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);     // translate chrome only
  $('[data-legal-content]').html(contentHtml);              // inject already-localized content
  if (slug === 'imprint') {                                 // § 5 DDG data card at the top of the body
    const card = buildImprintCard(dict, values);
    const bq = $('[data-legal-content] > blockquote').first();
    if (bq.length) bq.after(card); else $('[data-legal-content]').prepend(card);
  }
  if (slug === 'contact') {
    $('.legal-main').append(buildContactCard(dict, values.EMAIL)); // email card (outside .legal-body prose scope)
    $('.legal-main').append(buildContactForm(dict));        // demo form
  }
  if (h1) $('[data-legal-title]').text(h1);                 // localized page title from markdown H1
  rewriteLegalLinks($);                                     // localized legal slugs → /canonical.html
  rewriteLinks($, locale);
  applySwitcher($, locale, slug);
  applyHead($, { locale, pageKey: slug, title: `${h1} — Strido`, description });
  return $.html();
}
