/* ── actions ── task operations invoked by event handlers. Wraps the store
   with semantics (default tag, confirm-on-delete, archive/restore) and
   surfaces failures as toasts on the bus. ── */
import { state } from './state.js';
import { emit } from './bus.js';
import { genId } from './utils.js';
import { saveTaskDoc, updateTaskDoc, deleteTaskDoc, batchDelete } from './store.js';
import { confirmDelete } from './ui.js';

export async function addTask(q, text, note, tag, assignee) {
  if (!text.trim() || !state.currentUser) return;
  const id = genId();
  const t = {
    q, text: text.trim(), note: (note || '').trim(),
    tag: tag || state.categories[0].id, done: false,
    assignee: (q === 'q3' && assignee && assignee !== '__add__') ? assignee : '',
    createdAt: Date.now(), completedAt: null,
  };
  try { await saveTaskDoc(id, t); }
  catch { emit('toast', 'Failed to add task'); }
}

export async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  const nowDone = !task.done;
  try { await updateTaskDoc(id, { done: nowDone, completedAt: nowDone ? Date.now() : null }); }
  catch { emit('toast', 'Failed to update'); }
}

export function deleteTask(id) {
  confirmDelete(async () => {
    try { await deleteTaskDoc(id); }
    catch { emit('toast', 'Failed to delete'); }
  });
}

export function clearDone() {
  const done = state.tasks.filter(t => t.done); if (!done.length) return;
  confirmDelete(async () => {
    try { await batchDelete(done.map(t => t.id)); }
    catch { emit('toast', 'Failed to clear done tasks'); }
  });
}

export async function archiveTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  try {
    await updateTaskDoc(id, { archived: true, done: true, completedAt: task.completedAt || Date.now() });
    emit('toast', 'Moved to archive');
  } catch { emit('toast', 'Failed to archive'); }
}

export async function restoreTask(id) {
  try {
    await updateTaskDoc(id, { archived: false, done: false, completedAt: null });
    emit('toast', 'Task restored');
  } catch { emit('toast', 'Failed to restore'); }
}
