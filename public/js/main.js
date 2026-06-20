// =============================================
// PHAROS VIETNAM — MAIN JAVASCRIPT
// =============================================

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
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    const isOpen = navLinks.classList.contains('open');
    if (isOpen) {
      spans[0].style.transform = 'rotate(45deg) translateY(7px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translateY(-7px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close on nav link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
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

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const isDecimal = target % 1 !== 0;
  const duration = 2000;
  const start = performance.now();

  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    el.textContent = value.toLocaleString('vi-VN', {
      minimumFractionDigits: isDecimal ? 1 : 0,
      maximumFractionDigits: isDecimal ? 1 : 0
    });
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

// ---- RENDER NEWS PREVIEW (Homepage) ----
function renderNewsPreview() {
  const container = document.getElementById('newsPreview');
  if (!container || !window.PharosData) return;

  const preview = window.PharosData.news.slice(0, 3);

  container.innerHTML = preview.map(item => `
    <article class="news-card">
      <div class="news-category">${item.category}</div>
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
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === `${page}.html`);
  });
}

// ---- SMOOTH SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
