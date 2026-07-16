/* ── modals ── the four modal flows (edit task, manage categories, manage
   people, reminder settings) plus the <select> refresh helpers they share.
   Persists through the store; data changes propagate back via the bus. ── */
import { state } from './state.js';
import { emit } from './bus.js';
import { genId, esc, initials } from './utils.js';
import { COLOR_PRESETS, PERSON_COLORS } from './constants.js';
import { buildCatOptions, buildPeopleOptions } from './templates.js';
import { saveCategories, savePeople, saveSettings, updateTaskDoc, logMovement } from './store.js';
import { PRESET_VALS, freqToMs, msToLabel, getFreqMs, syncNotifDoc } from './reminders.js';

const $ = id => document.getElementById(id);

/* ── <select> refreshers (used across inline-add + edit modal) ── */
export function refreshAllSelects() {
  document.querySelectorAll('.inline-sel').forEach(sel => { sel.innerHTML = buildCatOptions(sel.value); });
}
export function refreshAssigneeSelects() {
  document.querySelectorAll('.inline-assignee').forEach(sel => {
    const cur = sel.value === '__add__' ? '' : sel.value;
    sel.innerHTML = buildPeopleOptions(cur);
  });
}
export function rebuildEditAssignee() {
  const sel = $('edit-assignee');
  const cur = sel.value === '__add__' ? '' : sel.value;
  sel.innerHTML = buildPeopleOptions(cur);
}

/* open the people modal from an assignee <select>'s "Add new person" option */
export function handleAssigneePick(sel, onPicked) {
  if (sel.value === '__add__') {
    sel.value = onPicked ? onPicked() : '';
    renderPeopleModal();
    $('people-overlay').classList.add('open');
  }
}

/* ── edit modal ── */
function toggleEditAssignee() {
  $('edit-assignee-field').style.display = $('edit-q').value === 'q3' ? '' : 'none';
}
export function openEdit(id) {
  const t = state.tasks.find(t => t.id === id); if (!t) return;
  state.editId = id;
  $('edit-text').value = t.text;
  $('edit-note').value = t.note || '';
  $('edit-tag').innerHTML = buildCatOptions(t.tag || 'work');
  $('edit-q').value = t.q;
  $('edit-assignee').innerHTML = buildPeopleOptions(t.assignee || '');
  toggleEditAssignee();
  $('edit-overlay').classList.add('open');
  setTimeout(() => $('edit-text').focus(), 100);
}
async function saveEdit() {
  const txt = $('edit-text').value.trim();
  if (!txt || !state.editId) return;
  const q = $('edit-q').value;
  let assignee = $('edit-assignee').value;
  if (assignee === '__add__') assignee = '';
  if (q !== 'q3') assignee = '';
  const fromQ = state.tasks.find(t => t.id === state.editId)?.q;
  try {
    await updateTaskDoc(state.editId, { text: txt, note: $('edit-note').value.trim(), tag: $('edit-tag').value, q, assignee });
    logMovement(state.editId, fromQ, q);
    $('edit-overlay').classList.remove('open'); state.editId = null;
  } catch { emit('toast', 'Failed to save'); }
}
function initEditModal() {
  const overlay = $('edit-overlay');
  $('edit-cancel').addEventListener('click', () => { overlay.classList.remove('open'); state.editId = null; });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); state.editId = null; } });
  $('edit-q').addEventListener('change', toggleEditAssignee);
  $('edit-assignee').addEventListener('change', () => handleAssigneePick($('edit-assignee')));
  $('edit-save').addEventListener('click', saveEdit);
}

/* ── category modal ── */
export function renderCatModal() {
  const list = $('cats-list');
  list.innerHTML = state.categories.map((cat, i) => `
    <div class="cat-row" data-idx="${i}">
      <button class="cat-swatch" style="background:${cat.bg};border-color:${cat.color}" data-idx="${i}" title="Cycle colour"></button>
      <input class="cat-label-inp" value="${esc(cat.label)}" data-idx="${i}">
      <div class="cat-err" id="cat-err-${i}">In use — remove tasks first.</div>
      <button class="cat-del-btn" data-idx="${i}" title="Delete">✕</button>
    </div>`).join('');

  list.querySelectorAll('.cat-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.getAttribute('data-idx');
      const cur = COLOR_PRESETS.findIndex(p => p.bg === state.categories[idx].bg && p.color === state.categories[idx].color);
      const next = COLOR_PRESETS[(cur + 1) % COLOR_PRESETS.length];
      state.categories[idx].bg = next.bg; state.categories[idx].color = next.color;
      renderCatModal();
    });
  });
  list.querySelectorAll('.cat-label-inp').forEach(inp => {
    inp.addEventListener('blur', () => {
      const idx = +inp.getAttribute('data-idx');
      const val = inp.value.trim(); if (val) state.categories[idx].label = val;
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });
  list.querySelectorAll('.cat-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.getAttribute('data-idx');
      if (state.tasks.some(t => t.tag === state.categories[idx].id)) {
        const err = $('cat-err-' + idx); if (err) err.style.display = 'block';
        return;
      }
      state.categories.splice(idx, 1); renderCatModal();
    });
  });
}
async function closeCatsModal() {
  await saveCategories();               // persists + emits 'categories:changed'
  $('cats-overlay').classList.remove('open');
}
function initCatsModal() {
  const overlay = $('cats-overlay');
  $('cats-btn').addEventListener('click', () => { renderCatModal(); overlay.classList.add('open'); });
  $('cats-close').addEventListener('click', closeCatsModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCatsModal(); });
  $('add-cat-btn').addEventListener('click', () => {
    const preset = COLOR_PRESETS[state.categories.length % COLOR_PRESETS.length];
    state.categories.push({ id: 'cat_' + genId(), label: 'New tag', bg: preset.bg, color: preset.color });
    renderCatModal();
  });
}

/* ── people modal ── */
export function renderPeopleModal() {
  const list = $('people-list');
  if (!state.people.length) {
    list.innerHTML = `<div class="people-empty">No people yet. Add someone to delegate tasks to.</div>`;
  } else {
    list.innerHTML = state.people.map((p, i) => `
      <div class="cat-row" data-idx="${i}">
        <button class="person-swatch" style="background:${p.color}" data-idx="${i}" title="Cycle colour">${p.name ? esc(initials(p.name)) : ''}</button>
        <input class="cat-label-inp person-name-inp" value="${esc(p.name)}" placeholder="Name…" data-idx="${i}">
        <div class="cat-err" id="person-err-${i}">In use — reassign tasks first.</div>
        <button class="cat-del-btn" data-idx="${i}" title="Delete">✕</button>
      </div>`).join('');
  }

  list.querySelectorAll('.person-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.getAttribute('data-idx');
      const cur = PERSON_COLORS.indexOf(state.people[idx].color);
      state.people[idx].color = PERSON_COLORS[(cur + 1) % PERSON_COLORS.length];
      renderPeopleModal();
    });
  });
  list.querySelectorAll('.person-name-inp').forEach(inp => {
    const commit = () => { const idx = +inp.getAttribute('data-idx'); state.people[idx].name = inp.value.trim(); };
    inp.addEventListener('input', () => {
      const idx = +inp.getAttribute('data-idx');
      const sw  = list.querySelector(`.person-swatch[data-idx="${idx}"]`);
      if (sw) sw.textContent = inp.value.trim() ? initials(inp.value) : '';
    });
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });
  list.querySelectorAll('.cat-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.getAttribute('data-idx');
      if (state.tasks.some(t => t.assignee === state.people[idx].id)) {
        const err = $('person-err-' + idx); if (err) err.style.display = 'block';
        return;
      }
      state.people.splice(idx, 1); renderPeopleModal();
    });
  });
}
async function closePeopleModal() {
  document.querySelectorAll('.person-name-inp').forEach(inp => {
    const idx = +inp.getAttribute('data-idx');
    if (state.people[idx]) state.people[idx].name = inp.value.trim();
  });
  state.people = state.people.filter(p => p.name);
  await savePeople();                   // persists + emits 'people:changed'
  $('people-overlay').classList.remove('open');
}
function initPeopleModal() {
  const overlay = $('people-overlay');
  $('people-btn').addEventListener('click', () => { renderPeopleModal(); overlay.classList.add('open'); });
  $('people-close').addEventListener('click', closePeopleModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePeopleModal(); });
  $('add-person-btn').addEventListener('click', () => {
    const color = PERSON_COLORS[state.people.length % PERSON_COLORS.length];
    state.people.push({ id: 'person_' + genId(), name: '', color });
    renderPeopleModal();
    const inputs = document.querySelectorAll('.person-name-inp');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

/* ── reminder settings modal ── */
function openReminderModal() {
  $('reminder-toggle').checked = !!state.settings.reminderEnabled;
  const freqSel = $('reminder-freq'), customRow = $('reminder-custom-row');
  const customVal = $('reminder-custom-val'), customUnit = $('reminder-custom-unit');
  const ms = getFreqMs();
  const match = PRESET_VALS.find(v => freqToMs(v) === ms);
  if (match) {
    freqSel.value = match; customRow.style.display = 'none';
  } else {
    freqSel.value = 'custom';
    if (ms < 3_600_000)       { customVal.value = Math.round(ms / 60_000);    customUnit.value = 'm'; }
    else if (ms < 86_400_000) { customVal.value = Math.round(ms / 3_600_000); customUnit.value = 'h'; }
    else                      { customVal.value = Math.round(ms / 86_400_000); customUnit.value = 'd'; }
    customRow.style.display = '';
  }
  const next = state.cachedNextSendAt;
  $('reminder-last').textContent = next && new Date(next) > new Date()
    ? `Next reminder: ${new Date(next).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${new Date(next).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : state.settings.reminderEnabled ? 'Reminder due — will send within 1 min' : 'Reminders disabled';
  $('reminder-overlay').classList.add('open');
}
async function saveReminder() {
  const freqSel = $('reminder-freq'), customVal = $('reminder-custom-val'), customUnit = $('reminder-custom-unit');
  state.settings.reminderEnabled = $('reminder-toggle').checked;
  let ms;
  if (freqSel.value === 'custom') {
    const v = parseInt(customVal.value, 10);
    if (!v || v < 1) { customVal.style.borderColor = 'var(--rust)'; customVal.focus(); return; }
    customVal.style.borderColor = '';
    const u = customUnit.value;
    ms = u === 'm' ? v * 60_000 : u === 'd' ? v * 86_400_000 : v * 3_600_000;
  } else {
    ms = freqToMs(freqSel.value);
  }
  state.settings.reminderFrequencyMs = ms;
  await saveSettings();
  await syncNotifDoc(true);
  $('reminder-overlay').classList.remove('open');
  emit('toast', state.settings.reminderEnabled ? `Reminders on — every ${msToLabel(ms)}` : 'Reminders disabled');
}
function initReminderModal() {
  const overlay = $('reminder-overlay');
  $('sb-reminder-btn').addEventListener('click', openReminderModal);
  $('reminder-cancel').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  $('reminder-freq').addEventListener('change', () => {
    const custom = $('reminder-freq').value === 'custom';
    $('reminder-custom-row').style.display = custom ? '' : 'none';
    if (custom) setTimeout(() => $('reminder-custom-val').focus(), 50);
  });
  $('reminder-save').addEventListener('click', saveReminder);
}

export function initModals() {
  initEditModal();
  initCatsModal();
  initPeopleModal();
  initReminderModal();
}
