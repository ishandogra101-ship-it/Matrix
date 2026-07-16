/* ── ui ── app chrome that isn't a full modal flow: toast, confirm dialog,
   quadrant maximize, mobile tab nav. Imported by actions (confirmDelete) and
   booted from app.js. Does not import actions/render (no cycle). ── */
import { on } from './bus.js?v=3';
import { state } from './state.js?v=3';

const $ = id => document.getElementById(id);

/* ── loading overlay ── */
export function hideLoading() {
  const l = $('loading');
  if (l) l.classList.add('hidden');
}

/* ── toast ── */
let toastTimer, undoHandler;
function resetUndo() {
  const btn = $('toast-undo');
  if (btn && undoHandler) { btn.removeEventListener('click', undoHandler); undoHandler = null; }
}
export function showToast(msg) {
  const t = $('toast'), undo = $('toast-undo');
  resetUndo();
  $('toast-msg').textContent = msg;
  if (undo) undo.style.display = 'none';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
/* toast with an Undo action; runs undoFn if the user clicks Undo before it fades */
export function showUndoToast(msg, undoFn, ms = 5000) {
  const t = $('toast'), undo = $('toast-undo');
  resetUndo();
  $('toast-msg').textContent = msg;
  if (undo) {
    undo.style.display = '';
    undoHandler = () => { clearTimeout(toastTimer); t.classList.remove('show'); resetUndo(); undoFn(); };
    undo.addEventListener('click', undoHandler);
  }
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); resetUndo(); }, ms);
}

/* ── confirm dialog (destructive actions) ── */
export function confirmDelete(fn) {
  state.deleteFn = fn;
  $('confirm-overlay').classList.add('open');
}
function initConfirm() {
  const overlay = $('confirm-overlay');
  $('confirm-yes').addEventListener('click', () => {
    overlay.classList.remove('open');
    if (state.deleteFn) { state.deleteFn(); state.deleteFn = null; }
  });
  $('confirm-no').addEventListener('click', () => { overlay.classList.remove('open'); state.deleteFn = null; });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); state.deleteFn = null; } });
}

/* ── maximize a quadrant on q-icon click ── */
function initMaximize() {
  document.querySelectorAll('.q-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const quad   = icon.closest('.quadrant');
      const wasMax = quad.classList.contains('maximized');
      document.querySelectorAll('.quadrant.maximized').forEach(q => {
        q.classList.remove('maximized'); q.querySelector('.q-icon').title = 'Expand';
      });
      if (!wasMax) { quad.classList.add('maximized'); icon.title = 'Collapse'; }
    });
  });
}

/* ── mobile tab navigation ── */
function initMobileTabs() {
  const matrixWrap = $('matrix-wrap');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.getAttribute('data-q');
      matrixWrap.setAttribute('data-active-tab', state.activeTab);
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.quadrant.maximized').forEach(q => {
        q.classList.remove('maximized'); q.querySelector('.q-icon').title = 'Expand';
      });
    });
  });
}

export function initUI() {
  initConfirm();
  initMaximize();
  initMobileTabs();
  on('toast', showToast);
}
