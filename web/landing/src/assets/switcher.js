(function () {
  var KEY = 'strido_lang';
  var LOCALES = ['de', 'en', 'fr', 'nl', 'es'];

  var sw = document.querySelector('[data-lang-switcher]');
  if (sw) {
    var btn = sw.querySelector('.lp-lang-btn');
    var menu = sw.querySelector('[data-lang-menu]');
    if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); var open = sw.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    document.addEventListener('click', function () { sw.classList.remove('open'); if (btn) btn.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { sw.classList.remove('open'); if (btn) btn.setAttribute('aria-expanded', 'false'); } });
    if (menu) menu.querySelectorAll('a[hreflang]').forEach(function (a) {
      a.addEventListener('click', function () { try { localStorage.setItem(KEY, a.getAttribute('hreflang')); } catch (e) {} });
    });
  }

  var isRoot = location.pathname === '/' || location.pathname === '/index.html';
  if (!isRoot) return;
  var target = null;
  try { target = localStorage.getItem(KEY); } catch (e) {}
  if (!target) {
    var navs = (navigator.languages || [navigator.language || 'de']).map(function (x) { return String(x).slice(0, 2).toLowerCase(); });
    for (var i = 0; i < navs.length; i++) { if (LOCALES.indexOf(navs[i]) >= 0) { target = navs[i]; break; } }
  }
  if (target && target !== 'de') location.replace('/' + target + '/');
})();
