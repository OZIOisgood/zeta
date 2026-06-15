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
export function buildContactForm(dict) {
  const t = (k) => dict[k] || k;
  const attr = (k) => t(k).replace(/"/g, '&quot;');
  return (
    '<form class="contact-form" onsubmit="return false;">' +
    `<h2>${t('Nachricht senden')}</h2>` +
    `<p>${t('Fragen, Feedback oder Interesse an einer Zusammenarbeit? Schreib uns direkt.')}</p>` +
    `<div class="contact-field"><label for="cf-name">${t('Name')}</label>` +
    `<input id="cf-name" type="text" placeholder="${attr('Dein Name')}" autocomplete="name"></div>` +
    `<div class="contact-field"><label for="cf-email">${t('E-Mail')}</label>` +
    `<input id="cf-email" type="email" placeholder="${attr('du@beispiel.de')}" autocomplete="email"></div>` +
    `<div class="contact-field"><label for="cf-msg">${t('Nachricht')}</label>` +
    `<textarea id="cf-msg" placeholder="${attr('Wie können wir helfen?')}"></textarea></div>` +
    `<button class="lp-btn lp-btn-primary" type="submit">${t('Nachricht senden')}</button>` +
    `<p class="contact-form-note">${t('Demo-Formular — wird noch nicht versendet.')}</p>` +
    '</form>'
  );
}

export function buildLegalPage({ shellHtml, contentHtml, h1, locale, slug, description, dict }) {
  const $ = cheerio.load(shellHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);     // translate chrome only
  $('[data-legal-content]').html(contentHtml);              // inject already-localized content
  if (slug === 'contact') $('[data-legal-content]').append(buildContactForm(dict)); // demo form
  if (h1) $('[data-legal-title]').text(h1);                 // localized page title from markdown H1
  rewriteLegalLinks($);                                     // localized legal slugs → /canonical.html
  rewriteLinks($, locale);
  applySwitcher($, locale, slug);
  applyHead($, { locale, pageKey: slug, title: `${h1} — Strido`, description });
  return $.html();
}
