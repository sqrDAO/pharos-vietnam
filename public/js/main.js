// =============================================
// PHAROS VIETNAM — MAIN JAVASCRIPT
// =============================================

// Lets the CSS apply the scroll-reveal start state. Set here (not in the CSS
// default) so [data-aos] content stays visible if this script never runs.
document.documentElement.classList.add('aos-ready');

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initCounters();
  initAOS();
  renderEcosystemPreview();
  renderNewsPreview();
  highlightActiveNav();
});

// ---- NAVBAR SCROLL ----
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---- MOBILE MENU ----
// The link list is a native popover opened by the hamburger's popovertarget
// (light-dismiss, Escape and aria-expanded come from the browser). On wider
// screens CSS shows the same list inline, so close it if the viewport grows
// while it is open.
function initMobileMenu() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks || typeof navLinks.hidePopover !== 'function') return;

  window.matchMedia('(max-width: 768px)').addEventListener('change', (e) => {
    if (!e.matches && navLinks.matches(':popover-open')) navLinks.hidePopover();
  });
}

// ---- COUNTER ANIMATION ----
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  // The HTML holds the final values (shown without JS or with reduced motion);
  // reset to 0 only when the count-up animation will run.
  if (!prefersReducedMotion()) counters.forEach(counter => { counter.textContent = '0'; });
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const isDecimal = target % 1 !== 0;
  const duration = 2000;
  const start = performance.now();
  const format = (value) => value.toLocaleString('vi-VN', {
    minimumFractionDigits: isDecimal ? 1 : 0,
    maximumFractionDigits: isDecimal ? 1 : 0
  });

  if (prefersReducedMotion()) {
    el.textContent = format(target);
    return;
  }

  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

// ---- AOS (Animate On Scroll) ----
function initAOS() {
  const elements = document.querySelectorAll('[data-aos]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('aos-animate');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ---- RENDER ECOSYSTEM PREVIEW (Homepage) ----
function renderEcosystemPreview() {
  const container = document.getElementById('ecosystemPreview');
  if (!container || !window.PharosData) return;

  const preview = window.PharosData.ecosystem.slice(0, 8);

  container.innerHTML = preview.map(project => `
    <div class="eco-card" data-aos="fade-up">
      <div class="eco-icon">${project.icon}</div>
      <div class="eco-name">${project.name}</div>
      <div class="eco-category">${project.category}</div>
    </div>
  `).join('');

  initAOS();
}

// ---- NEWS ORDER & MEDIA (shared with news.js) ----
// Entries with `pinned: true` lead; everything else keeps data.js order.
// Pinning lives here, not in the array, because the weekly content pipeline
// prepends new entries and would otherwise push a hand-placed entry down.
function orderedNews() {
  const news = (window.PharosData && window.PharosData.news) || [];
  return [...news.filter(n => n.pinned), ...news.filter(n => !n.pinned)];
}

function newsImage(item) {
  if (!item.image) return '';
  return `<img class="news-image" src="${item.image}" alt="${item.imageAlt || item.title}" loading="lazy">`;
}

function newsPinnedBadge(item) {
  return item.pinned ? '<span class="news-pinned">★ Nổi bật</span>' : '';
}

// ---- RENDER NEWS PREVIEW (Homepage) ----
function renderNewsPreview() {
  const container = document.getElementById('newsPreview');
  if (!container || !window.PharosData) return;

  const preview = orderedNews().slice(0, 3);

  container.innerHTML = preview.map(item => `
    <article class="news-card${item.pinned ? ' news-featured' : ''}">
      ${newsImage(item)}
      <div class="news-category">${newsPinnedBadge(item)}${item.category}</div>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <div class="news-footer">
        <span>${item.date}</span>
        <a href="${item.link}" target="_blank" class="news-read-link">Đọc thêm →</a>
      </div>
    </article>
  `).join('');
}

// ---- HIGHLIGHT ACTIVE NAV ----
// Prefer the page identity declared on <body data-page="...">; fall back to the
// URL filename so it still works if the attribute is missing.
function highlightActiveNav() {
  const page = document.body.dataset.page
    || (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')
    || 'index';
  document.querySelectorAll('.nav-link').forEach(link => {
    const isCurrent = link.getAttribute('href') === `${page}.html`;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
