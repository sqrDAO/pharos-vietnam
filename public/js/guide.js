// =============================================
// PHAROS VIETNAM — GUIDE PAGE (FAQ accordion)
// =============================================
// Plain global script. Loaded after main.js on guide.html.

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('faqContainer');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const item = e.target.closest('.faq-item');
    if (!item) return;

    const answer = item.querySelector('.faq-answer');
    const arrow = item.querySelector('.faq-arrow');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

    // Close all
    container.querySelectorAll('.faq-answer').forEach(a => a.style.maxHeight = '0');
    container.querySelectorAll('.faq-arrow').forEach(a => a.style.transform = '');

    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
      arrow.style.transform = 'rotate(180deg)';
    }
  });
});
