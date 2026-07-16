/* ── templates ── pure HTML string builders + category/people lookups.
   Read state; no DOM, no side effects. ── */
import { esc, initials, fmtDate } from './utils.js?v=3';
import { state } from './state.js?v=3';
import { SELF_PERSON } from './constants.js?v=3';

/* ── category helpers ── */
export function getCatLabel(id) {
  const c = state.categories.find(x => x.id === id);
  return c ? c.label : id;
}
export function tagStyle(id) {
  const c = state.categories.find(x => x.id === id) || state.categories[state.categories.length - 1];
  return `background:${c.bg};color:${c.color}`;
}
export function buildCatOptions(selectedId) {
  return state.categories.map(c =>
    `<option value="${esc(c.id)}"${c.id === selectedId ? ' selected' : ''}>${esc(c.label)}</option>`
  ).join('');
}

/* ── people helpers ── */
export function getPerson(id) {
  if (!id) return null;
  if (id === 'self') return SELF_PERSON;
  return state.people.find(p => p.id === id) || null;
}
export function buildPeopleOptions(selectedId) {
  const sel = selectedId || '';
  let html  = `<option value=""${sel === '' ? ' selected' : ''}>Unassigned</option>`;
  html     += `<option value="self"${sel === 'self' ? ' selected' : ''}>Self</option>`;
  state.people.forEach(p => {
    html += `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.name)}</option>`;
  });
  html += `<option value="__add__">＋ Add new person…</option>`;
  return html;
}
/* small person icon + name shown on delegated cards */
export function personChip(id) {
  const p = getPerson(id);
  if (!p) return '';
  const c = p.color || '#5b5bf5';
  return `<span class="assignee-chip" title="Delegated to ${esc(p.name)}">
            <svg class="assignee-ic" width="11" height="11" viewBox="0 0 12 12" fill="${c}"><circle cx="6" cy="3.5" r="2.3"/><path d="M1.5 11c0-2.4 2-3.8 4.5-3.8s4.5 1.4 4.5 3.8z"/></svg>
            <span class="assignee-name">${esc(p.name)}</span>
          </span>`;
}

/* ── task card ── */
export function taskHTML(t) {
  const dateStr = t.done && t.completedAt
    ? `<span class="task-date done-date">✓ ${fmtDate(t.completedAt)}</span>`
    : t.createdAt ? `<span class="task-date">${fmtDate(t.createdAt)}</span>` : '';
  return `<div class="task-card${t.done ? ' done-card' : ''}"
               data-id="${t.id}" data-text="${esc(t.text)}" data-note="${esc(t.note || '')}">
    <div class="task-chk${t.done ? ' checked' : ''}" data-action="toggle" data-id="${t.id}"></div>
    <div class="task-body">
      <div class="task-text">${esc(t.text)}</div>
      <div class="task-meta">
        ${t.q === 'q3' ? personChip(t.assignee) : ''}
        <span class="task-tag" style="${tagStyle(t.tag || 'other')}">${esc(getCatLabel(t.tag || 'other'))}</span>
        ${dateStr}
      </div>
    </div>
    <div class="task-actions">
      <button class="ta-btn" data-action="edit" data-id="${t.id}" title="Edit">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.5 1.5l2 2L3.5 11H1V8.5L8.5 1.5z"/>
        </svg>
      </button>
      ${t.done ? `<button class="ta-btn arch" data-action="archive" data-id="${t.id}" title="Move to archive">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1.2" y="4.5" width="9.6" height="6" rx="1"/><path d="M1.2 4.5L2.5 1.5h7L10.8 4.5"/><path d="M4.5 7.2h3"/>
        </svg>
      </button>` : ''}
      <button class="ta-btn del" data-action="del" data-id="${t.id}" title="Delete">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/>
        </svg>
      </button>
    </div>
  </div>`;
}

/* ── archived card ── */
export function archiveCardHTML(t) {
  const qLabel = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' }[t.q];
  const qColor = { q1: 'var(--rust)', q2: 'var(--primary)', q3: 'var(--green)', q4: 'var(--ink3)' }[t.q];
  return `<div class="archive-card">
    <div class="archive-card-body">
      <div class="archive-task-text">${esc(t.text)}</div>
      <div class="archive-task-meta">
        <span class="archive-q-badge" style="background:${qColor}18;color:${qColor};">${qLabel}</span>
        <span class="task-tag" style="${tagStyle(t.tag || 'other')}">${esc(getCatLabel(t.tag || 'other'))}</span>
        ${t.completedAt ? `<span class="archive-date">Done ${fmtDate(t.completedAt)}</span>` : ''}
      </div>
    </div>
    <div class="archive-card-actions">
      <button class="ta-btn restore-btn" data-action="restore" data-id="${t.id}" title="Restore to quadrant">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h5a3 3 0 010 6H4"/><path d="M4 3L2 5l2 2"/></svg>
      </button>
      <button class="ta-btn del" data-action="arch-del" data-id="${t.id}" title="Delete permanently">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
      </button>
    </div>
  </div>`;
}
