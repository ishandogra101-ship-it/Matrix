/* ── dragdrop ── desktop drag + touch drag for task cards: reorder within a
   quadrant and move between quadrants. Persists via the store. ── */
import { state } from './state.js';
import { emit } from './bus.js';
import { updateTaskDoc, setSortOrders, logMovement } from './store.js';
import { QUADRANTS } from './constants.js';

/* reorder within a quadrant using the current DOM order as the source of truth */
async function reorderWithinQuadrant(movedId, targetId, insertBefore, q) {
  const body = document.getElementById(q + '-body');
  const ids  = [...body.querySelectorAll('.task-card')].map(c => c.getAttribute('data-id'));
  const reordered = ids.filter(id => id !== movedId);
  const ti = reordered.indexOf(targetId);
  reordered.splice(insertBefore ? ti : ti + 1, 0, movedId);
  try { await setSortOrders(reordered); }
  catch { emit('toast', 'Reorder failed'); }
}

/* ── desktop drag ── */
function makeDraggable(card, id) {
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', e => {
    state.dragId = id; card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.drop-before,.drop-after').forEach(c => c.classList.remove('drop-before', 'drop-after'));
    state.dragId = null;
  });
  card.addEventListener('dragover', e => {
    if (state.dragId === id) return;
    e.preventDefault(); e.stopPropagation();
    const mid = card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
    card.classList.toggle('drop-before', e.clientY < mid);
    card.classList.toggle('drop-after',  e.clientY >= mid);
  });
  card.addEventListener('dragleave', () => card.classList.remove('drop-before', 'drop-after'));
  card.addEventListener('drop', async e => {
    e.preventDefault(); e.stopPropagation();
    card.classList.remove('drop-before', 'drop-after');
    const droppedId = e.dataTransfer.getData('text/plain') || state.dragId;
    if (!droppedId || droppedId === id) return;
    const draggedTask = state.tasks.find(t => t.id === droppedId);
    const targetTask  = state.tasks.find(t => t.id === id);
    if (!draggedTask || draggedTask.q !== targetTask?.q) return;
    const mid = card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
    await reorderWithinQuadrant(droppedId, id, e.clientY < mid, draggedTask.q);
  });
}

/* ── touch drag ── */
let touchDragId = null, touchClone = null, touchOriginQ = null;
function makeTouchDraggable(card, id, q) {
  card.addEventListener('touchstart', e => {
    if (e.target.closest('button') || e.target.closest('.task-chk')) return;
    touchDragId = id; touchOriginQ = q;
    const rect = card.getBoundingClientRect();
    touchClone = card.cloneNode(true);
    touchClone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:.65;pointer-events:none;z-index:9999;border-radius:15px;box-shadow:0 20px 40px rgba(28,30,80,.25);`;
    document.body.appendChild(touchClone); card.style.opacity = '.25';
  }, { passive: true });
  card.addEventListener('touchmove', e => {
    if (!touchClone) return; e.preventDefault();
    const t = e.touches[0];
    touchClone.style.left = (t.clientX - touchClone.offsetWidth / 2) + 'px';
    touchClone.style.top  = (t.clientY - 36) + 'px';
    document.querySelectorAll('.quadrant').forEach(qd => qd.classList.remove('drag-over'));
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const tq = el ? el.closest('.quadrant') : null;
    if (tq) tq.classList.add('drag-over');
  }, { passive: false });
  card.addEventListener('touchend', async e => {
    if (!touchClone) return;
    const t  = e.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const tq = el ? el.closest('.quadrant') : null;
    document.querySelectorAll('.quadrant').forEach(qd => qd.classList.remove('drag-over'));
    if (tq && tq.getAttribute('data-q') !== touchOriginQ) {
      const newQ = tq.getAttribute('data-q');
      try { await updateTaskDoc(touchDragId, { q: newQ }); logMovement(touchDragId, touchOriginQ, newQ); }
      catch { /* silent */ }
    }
    touchClone.remove(); touchClone = null; card.style.opacity = '';
    touchDragId = null; touchOriginQ = null;
  });
}

/* attach both drag behaviors to a freshly-rendered card */
export function attachDrag(card, id, q) {
  makeDraggable(card, id);
  makeTouchDraggable(card, id, q);
}

/* quadrant-level drop zones: dropping a card onto another quadrant moves it */
export function initQuadrantDropZones() {
  document.querySelectorAll('.quadrant').forEach(quad => {
    quad.addEventListener('dragover',  e => { e.preventDefault(); quad.classList.add('drag-over'); });
    quad.addEventListener('dragleave', e => { if (!quad.contains(e.relatedTarget)) quad.classList.remove('drag-over'); });
    quad.addEventListener('drop', async e => {
      e.preventDefault(); quad.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain') || state.dragId; if (!id) return;
      const newQ  = quad.getAttribute('data-q');
      const fromQ = state.tasks.find(t => t.id === id)?.q;
      if (newQ === fromQ) return;
      try { await updateTaskDoc(id, { q: newQ }); logMovement(id, fromQ, newQ); }
      catch { /* silent */ }
    });
  });
}
