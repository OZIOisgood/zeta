import { LOCALES, DEFAULT_LOCALE, SITE_ORIGIN, LEGAL_SLUGS } from './config.mjs';
import { absoluteUrl } from './pages.mjs';

const pageKeys = () => ['index', ...LEGAL_SLUGS];

export function buildSitemap() {
  const blocks = [];
  for (const pageKey of pageKeys()) {
    for (const l of LOCALES) {
      const alts = LOCALES.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.code}" href="${absoluteUrl(a.code, pageKey)}"/>`);
      alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl(DEFAULT_LOCALE, pageKey)}"/>`);
      blocks.push(`  <url>\n    <loc>${absoluteUrl(l.code, pageKey)}</loc>\n${alts.join('\n')}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${blocks.join('\n')}\n</urlset>\n`;
}

export function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
