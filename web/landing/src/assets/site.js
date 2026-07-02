(function () {
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
  if (window.lucide) window.lucide.createIcons();

  document.querySelectorAll('[data-contact-form]').forEach(function (form) {
    var button = form.querySelector('[data-contact-submit]');
    var status = form.querySelector('[data-contact-status]');
    if (!button || !status || !window.fetch) return;
    var defaultLabel = button.textContent;

    function updateButton() {
      button.disabled = !form.checkValidity();
    }
    updateButton();
    form.addEventListener('input', updateButton);
    form.addEventListener('change', updateButton);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var fields = new FormData(form);
      button.disabled = true;
      button.textContent = form.dataset.sendingLabel;
      status.textContent = '';
      status.className = 'contact-form-note';

      window.fetch(form.dataset.contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.get('name'),
          email: fields.get('email'),
          message: fields.get('message'),
          website: fields.get('website'),
          locale: document.documentElement.lang || '',
          page_url: window.location.href
        })
      }).then(function (response) {
        if (!response.ok) throw new Error('contact request failed');
        form.reset();
        status.textContent = form.dataset.successLabel;
        status.classList.add('is-success');
        updateButton();
      }).catch(function () {
        status.textContent = form.dataset.errorLabel;
        status.classList.add('is-error');
      }).finally(function () {
        button.disabled = false;
        button.textContent = defaultLabel;
      });
    });
  });

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
