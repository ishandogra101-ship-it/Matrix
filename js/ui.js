/* ── ui ── app chrome that isn't a full modal flow: toast, confirm dialog,
   quadrant maximize, mobile tab nav. Imported by actions (confirmDelete) and
   booted from app.js. Does not import actions/render (no cycle). ── */
import { on } from './bus.js';
import { state } from './state.js';

const $ = id => document.getElementById(id);

/* ── toast ── */
let toastTimer;
export function showToast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
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
