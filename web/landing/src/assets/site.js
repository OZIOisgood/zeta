(function () {
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
  if (window.lucide) window.lucide.createIcons();

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
