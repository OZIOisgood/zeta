(function () {
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
  if (window.lucide) window.lucide.createIcons();

  // Manual prev/next scrolling for the sports marquee (used in the reduced-motion fallback)
  document.querySelectorAll('[data-marquee-wrap]').forEach(function (wrap) {
    var m = wrap.querySelector('[data-marquee]');
    var prev = wrap.querySelector('[data-marquee-prev]');
    var next = wrap.querySelector('[data-marquee-next]');
    if (!m || !prev || !next) return;
    var step = function () { return Math.max(160, Math.round(m.clientWidth * 0.7)); };
    var update = function () {
      var overflow = m.scrollWidth - m.clientWidth;
      var scrollable = overflow > 2;
      prev.style.display = next.style.display = scrollable ? '' : 'none';
      prev.disabled = m.scrollLeft <= 0;
      next.disabled = m.scrollLeft >= overflow - 1;
    };
    prev.addEventListener('click', function () { m.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { m.scrollBy({ left: step(), behavior: 'smooth' }); });
    m.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  var mql = window.matchMedia('(prefers-reduced-motion: no-preference)');
  if (!('IntersectionObserver' in window) || !mql.matches) return;
  document.documentElement.classList.add('lp-anim');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('lp-in'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.lp-reveal').forEach(function (el) { observer.observe(el); });
})();
