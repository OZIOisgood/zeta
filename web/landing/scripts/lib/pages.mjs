import * as cheerio from 'cheerio';
import { LOCALES, DEFAULT_LOCALE, SITE_ORIGIN } from './config.mjs';
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

export function applySwitcher($, locale, pageKey) {
  const cur = LOCALES.find((l) => l.code === locale);
  $('[data-lang-current]').text(cur.short);
  const menu = $('[data-lang-menu]');
  menu.empty();
  for (const l of LOCALES) {
    const active = l.code === locale;
    menu.append(
      `<a class="lp-lang-opt${active ? ' is-active' : ''}" href="${localePath(l.code, pageKey)}" hreflang="${l.code}"${active ? ' aria-current="true"' : ''}>` +
        `<span class="lp-lang-opt-short">${l.short}</span><span class="lp-lang-opt-label">${l.label}</span>` +
        `${active ? '<i data-lucide="check"></i>' : ''}</a>`,
    );
  }
}

export function applyHead($, { locale, pageKey, title, description }) {
  $('html').attr('lang', locale);
  $('title').text(title);
  if ($('meta[name="description"]').length) $('meta[name="description"]').attr('content', description);
  else $('head').append(`<meta name="description" content="${description}">`);
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

export function buildLegalPage({ shellHtml, contentHtml, h1, locale, slug, description, dict }) {
  const $ = cheerio.load(shellHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);     // translate chrome only
  $('[data-legal-content]').html(contentHtml);              // inject already-localized content
  rewriteLinks($, locale);
  applySwitcher($, locale, slug);
  applyHead($, { locale, pageKey: slug, title: `${h1} — Strido`, description });
  return $.html();
}
