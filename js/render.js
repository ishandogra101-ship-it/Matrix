/* ── render ── reads state, writes DOM. Subscribed to bus change events in
   app.js. Does not import the store's write functions. ── */
import { state } from './state.js?v=3';
import { QUADRANTS } from './constants.js?v=3';
import { quadrantTasks, isArchived } from './domain.js?v=3';
import { taskHTML, archiveCardHTML } from './templates.js?v=3';
import { attachDrag } from './dragdrop.js?v=3';
import { lerpColor } from './utils.js?v=3';

const $ = id => document.getElementById(id);

export function render() {
  let total = 0, done = 0;
  QUADRANTS.forEach(q => {
    const qt = quadrantTasks(state.tasks, q);
    const dc = qt.filter(t => t.done).length;
    total += qt.length; done += dc;
    $(q + '-count').textContent = qt.length ? `${dc}/${qt.length}` : '0';

    const body = $(q + '-body');
    if (!qt.length) {
      body.innerHTML = `<div class="q-empty"><span class="q-empty-icon">◻</span>Drop tasks here</div>`;
      if (q === 'q1') $('q1-priority-hint').style.display = 'none';
      return;
    }
    body.innerHTML = qt.map(taskHTML).join('');
    body.querySelectorAll('.task-card').forEach(card => attachDrag(card, card.getAttribute('data-id'), q));

    if (q === 'q1') {
      const cards = body.querySelectorAll('.task-card');
      const n = cards.length;
      cards.forEach((card, i) => { card.style.borderLeft = `3px solid ${lerpColor(n > 1 ? i / (n - 1) : 0)}`; });
      $('q1-priority-hint').style.display = '';
    }
  });

  $('stats-text').innerHTML = `<strong>${total - done}</strong> open · <strong>${done}</strong> done`;
  applySearch();
  renderArchive();
}

/* per-quadrant archive sections (auto/manual archived tasks) */
export function renderArchive() {
  const archived = state.tasks.filter(isArchived);
  QUADRANTS.forEach(q => {
    const group   = archived.filter(t => t.q === q);
    const section = $(q + '-archive');
    if (!section) return;
    if (!group.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    $(q + '-archive-count').textContent = group.length;
    $(q + '-archive-body').innerHTML = group.map(archiveCardHTML).join('');
  });
}

/* live client-side search highlight/filter over rendered cards */
export function applySearch() {
  const q = state.searchQ;
  document.querySelectorAll('.task-card').forEach(card => {
    if (!q) { card.classList.remove('search-hidden', 'search-match'); return; }
    const matches =
      (card.getAttribute('data-text') || '').toLowerCase().includes(q) ||
      (card.getAttribute('data-note') || '').toLowerCase().includes(q);
    card.classList.toggle('search-hidden', !matches);
    card.classList.toggle('search-match',  matches);
  });
}
