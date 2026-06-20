// =============================================
// ECOSYSTEM PAGE — Filter & Render Logic
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  renderEcosystemFull();
  initEcoFilter();
});

function renderEcosystemFull() {
  const grid = document.getElementById('ecoFullGrid');
  if (!grid || !window.PharosData) return;

  const projects = window.PharosData.ecosystem;
  grid.innerHTML = projects.map(p => `
    <div class="eco-full-card" data-category="${p.category}" data-aos="fade-up">
      <div class="eco-full-header">
        <div class="eco-full-icon">${p.icon}</div>
        <div>
          <h3>${p.name}</h3>
          <div class="eco-badge">${p.category} · ${p.status}</div>
        </div>
      </div>
      <p>${p.description}</p>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px;">
        ${p.tags.map(t => `<span style="font-size:0.72rem; color:var(--text-muted); background:var(--bg-surface); border:1px solid var(--border-subtle); padding:2px 8px; border-radius:100px;">${t}</span>`).join('')}
      </div>
      ${p.website && p.website !== '#' ? `<div class="eco-links"><a href="${p.website}" target="_blank" class="eco-link">Website ↗</a></div>` : ''}
    </div>
  `).join('');

  // Re-init AOS for new elements
  if (typeof initAOS === 'function') initAOS();
}

function initEcoFilter() {
  const filterContainer = document.getElementById('ecoFilter');
  if (!filterContainer) return;

  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    // Update active state
    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    const cards = document.querySelectorAll('.eco-full-card');

    cards.forEach(card => {
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
