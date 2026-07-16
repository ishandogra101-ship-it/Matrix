/* ── app ── board entry point. Boots chrome + modals, wires the bus to the
   renderer, attaches delegated DOM listeners, guards auth, and starts the
   Firestore subscription. Mirrors Docket's main.js. ── */
import { configured, auth, onAuthStateChanged, signOut } from './firebase.js';
import { on } from './bus.js';
import { state } from './state.js';
import { QUADRANTS } from './constants.js';
import { initRefs, subscribeTasks, unsubscribe, loadCategories, loadPeople, loadSettings } from './store.js';
import { render, applySearch } from './render.js';
import { initQuadrantDropZones } from './dragdrop.js';
import { buildCatOptions, buildPeopleOptions } from './templates.js';
import * as A from './actions.js';
import { initUI } from './ui.js';
import { initModals, openEdit, handleAssigneePick, refreshAllSelects, refreshAssigneeSelects, rebuildEditAssignee } from './modals.js';
import { syncNotifDoc } from './reminders.js';
import { checkMigration } from './migration.js';

const $ = id => document.getElementById(id);
const BASE = window.MATRIX_BASE || './';   // './' at site root, '../' for clean-URL folder copies

/* ── not configured: show setup notice and stop ── */
if (!configured) {
  document.querySelector('.main-area').innerHTML = `
    <div style="padding:40px;font-family:inherit;max-width:500px;margin:auto;">
      <h2 style="font-family:'Space Grotesk',sans-serif;margin-bottom:12px;">Firebase setup required</h2>
      <p style="color:#73769e;line-height:1.6;">Open <code style="background:#eef0fb;padding:2px 8px;border-radius:5px;">firebase-config.js</code> and fill in your Firebase project credentials.<br>See the comments in that file for step-by-step instructions.</p>
    </div>`;
  throw new Error('Firebase not configured');
}

/* ── bus → view ── */
on('tasks:changed', render);
on('categories:changed', () => { render(); refreshAllSelects(); });
on('people:changed', () => { render(); refreshAssigneeSelects(); rebuildEditAssignee(); });

/* ── boot chrome (safe to wire before auth resolves) ── */
initUI();
initModals();
initQuadrantDropZones();
initInlineAdd();
initBoardDelegation();
initSearch();

$('sb-logout').addEventListener('click', async () => {
  unsubscribe();
  await signOut(auth);
  window.location.href = BASE + 'login';
});
$('clear-done-btn').addEventListener('click', A.clearDone);

/* ── auth guard ── */
onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = BASE + 'login'; return; }
  initApp(user);
});

async function initApp(user) {
  initRefs(user);
  $('sb-user').textContent = user.email.split('@')[0];
  await Promise.all([loadCategories(), loadPeople(), loadSettings()]);
  refreshAllSelects();
  subscribeTasks(() => syncNotifDoc());   // sync the notification doc after first snapshot
  checkMigration();
}

/* ── board click delegation (per quadrant) ── */
function initBoardDelegation() {
  QUADRANTS.forEach(q => {
    $(q).addEventListener('click', e => {
      const el = e.target.closest('[data-action]'); if (!el) return;
      const id = el.getAttribute('data-id');
      switch (el.getAttribute('data-action')) {
        case 'toggle':   A.toggleTask(id); break;
        case 'edit':     openEdit(id); break;
        case 'del':      A.deleteTask(id); break;
        case 'archive':  A.archiveTask(id); break;
        case 'restore':  A.restoreTask(id); break;
        case 'arch-del': A.deleteTask(id); break;
      }
    });
  });
}

/* ── inline add (per quadrant footer) ── */
function closePanel(q) {
  const panel = $(q + '-add');
  panel.classList.remove('open');
  panel.querySelector('.inline-inp').value  = '';
  panel.querySelector('.inline-note').value = '';
  const btn = document.querySelector(`.add-task-btn[data-q="${q}"]`);
  if (btn) btn.style.display = '';
}
function submitInlineAdd(q) {
  const panel = $(q + '-add');
  const inp   = panel.querySelector('.inline-inp');
  const note  = panel.querySelector('.inline-note');
  const sel   = panel.querySelector('.inline-sel');
  const asg   = panel.querySelector('.inline-assignee');
  if (!inp.value.trim()) { inp.focus(); return; }
  A.addTask(q, inp.value, note.value, sel.value, asg ? asg.value : '');
  closePanel(q);
}
function initInlineAdd() {
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-q');
      document.querySelectorAll('.inline-add').forEach(el => { if (el.id !== q + '-add') el.classList.remove('open'); });
      document.querySelectorAll('.add-task-btn').forEach(b => { b.style.display = ''; });
      const panel  = $(q + '-add');
      const isOpen = panel.classList.toggle('open');
      btn.style.display = isOpen ? 'none' : '';
      if (isOpen) {
        panel.querySelector('.inline-sel').innerHTML = buildCatOptions('');
        const asg = panel.querySelector('.inline-assignee');
        if (asg) asg.innerHTML = buildPeopleOptions('');
        setTimeout(() => panel.querySelector('.inline-inp').focus(), 50);
      }
    });
  });
  document.querySelectorAll('.inline-cancel').forEach(btn => {
    btn.addEventListener('click', () => closePanel(btn.getAttribute('data-q')));
  });
  document.querySelectorAll('.inline-ok').forEach(btn => {
    btn.addEventListener('click', () => submitInlineAdd(btn.getAttribute('data-q')));
  });
  document.querySelectorAll('.inline-assignee').forEach(sel => {
    sel.addEventListener('change', () => handleAssigneePick(sel));
  });
  document.querySelectorAll('.inline-inp').forEach(inp => {
    inp.addEventListener('keydown', e => {
      const q = inp.getAttribute('data-q');
      if (e.key === 'Enter')  submitInlineAdd(q);
      if (e.key === 'Escape') closePanel(q);
    });
  });
}

/* ── search ── */
function initSearch() {
  $('search-inp').addEventListener('input', e => {
    state.searchQ = e.target.value.trim().toLowerCase();
    applySearch();
  });
}
