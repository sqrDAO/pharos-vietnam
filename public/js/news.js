// =============================================
// PHAROS VIETNAM — NEWS PAGE
// =============================================
// Plain global script. Loaded after data.js + main.js on news.html.
// Renders the full news grid and category filter from window.PharosData.

document.addEventListener('DOMContentLoaded', () => {
  renderNewsFull();
  initNewsFilter();
  showLastUpdate();
});

function renderNewsFull() {
  const grid = document.getElementById('newsFullGrid');
  if (!grid || !window.PharosData) return;

  const news = window.PharosData.news;
  grid.innerHTML = news.map(item => `
    <article class="news-full-card" data-category="${item.category}" data-aos="fade-up">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="news-category">${item.category}</span>
        <span class="news-date">${item.date}</span>
      </div>
      <h3>${item.title}</h3>
      <p>${item.content || item.summary}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
        <span style="font-size:0.8rem; color:var(--text-muted);">${item.source}</span>
        <a href="${item.link}" target="_blank" style="color:var(--pharos-gold); font-size:0.85rem; font-weight:500;">Đọc thêm →</a>
      </div>
    </article>
  `).join('');

  if (typeof initAOS === 'function') initAOS();
}

function initNewsFilter() {
  const filterContainer = document.getElementById('newsFilter');
  if (!filterContainer) return;

  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    document.querySelectorAll('.news-full-card').forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = '';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
      } else {
        card.style.display = 'none';
      }
    });
  });
}

function showLastUpdate() {
  const el = document.getElementById('lastUpdateDate');
  if (el && window.PharosData) {
    el.textContent = window.PharosData.meta.lastUpdated;
  }
}
