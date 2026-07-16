/* ── store ── Firestore reads/writes for the signed-in user. Owns the data
   caches (via state setters) and announces changes on the bus. NEVER imports
   the view layer — it emits 'tasks:changed' / 'categories:changed' /
   'people:changed' / 'settings:changed' / 'toast', and the view subscribes.
   All paths hang off state.refs so the auth seam lives in one place. ── */
import { db, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, addDoc } from './firebase.js?v=3';
import { emit } from './bus.js?v=3';
import { state, setTasks, setCategories, setPeople, setSettings } from './state.js?v=3';

/* ── refs / subscriptions ── */
export function initRefs(user) {
  state.currentUser = user;
  state.refs = {
    tasksRef:      collection(db, 'users', user.uid, 'tasks'),
    categoriesRef: doc(db, 'users', user.uid, 'categories', 'list'),
    peopleRef:     doc(db, 'users', user.uid, 'people', 'list'),
    movementsRef:  collection(db, 'users', user.uid, 'movements'),
    settingsRef:   doc(db, 'users', user.uid, 'settings', 'prefs'),
  };
}

export function subscribeTasks(onFirstSnap) {
  state.firstSnap = true;
  state.unsubTasks = onSnapshot(state.refs.tasksRef, snap => {
    setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    if (state.firstSnap) { state.firstSnap = false; onFirstSnap && onFirstSnap(); }
  });
}

export function unsubscribe() { if (state.unsubTasks) state.unsubTasks(); }

/* ── categories ── */
export async function loadCategories() {
  try {
    const snap = await getDoc(state.refs.categoriesRef);
    if (snap.exists() && snap.data().items?.length) state.categories = snap.data().items;
  } catch { /* use defaults */ }
}
export async function saveCategories() {
  try { await setDoc(state.refs.categoriesRef, { items: state.categories }); }
  catch { emit('toast', 'Failed to save categories'); }
  setCategories(state.categories);
}

/* ── people ── */
export async function loadPeople() {
  try {
    const snap = await getDoc(state.refs.peopleRef);
    if (snap.exists() && Array.isArray(snap.data().items)) state.people = snap.data().items;
  } catch { /* none yet */ }
}
export async function savePeople() {
  try { await setDoc(state.refs.peopleRef, { items: state.people }); }
  catch { emit('toast', 'Failed to save people'); }
  setPeople(state.people);
}

/* ── settings ── */
export async function loadSettings() {
  try {
    const snap = await getDoc(state.refs.settingsRef);
    if (snap.exists()) state.settings = { ...state.settings, ...snap.data() };
  } catch { /* use defaults */ }
}
export async function saveSettings() {
  try { await setDoc(state.refs.settingsRef, state.settings, { merge: true }); }
  catch { /* silent */ }
  setSettings(state.settings);
}

/* ── movement log (silent) ── */
export async function logMovement(taskId, fromQ, toQ) {
  if (!fromQ || fromQ === toQ) return;
  const task = state.tasks.find(t => t.id === taskId);
  try {
    await addDoc(state.refs.movementsRef, { taskId, taskText: task?.text || '', from: fromQ, to: toQ, at: Date.now() });
  } catch { /* don't interrupt the user for a logging failure */ }
}

/* ── raw task doc ops (callers wrap with toast/undo semantics) ── */
export const saveTaskDoc   = (id, data)  => setDoc(doc(state.refs.tasksRef, id), data);
export const updateTaskDoc = (id, patch) => updateDoc(doc(state.refs.tasksRef, id), patch);
export const deleteTaskDoc = id          => deleteDoc(doc(state.refs.tasksRef, id));

export function batchDelete(ids) {
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(state.refs.tasksRef, id)));
  return batch.commit();
}

export function setSortOrders(orderedIds) {
  return Promise.all(orderedIds.map((id, i) => updateTaskDoc(id, { sortOrder: i * 1000 })));
}

export function importLegacyTasks(oldTasks) {
  const batch = writeBatch(db);
  oldTasks.forEach(t => {
    const id = t.id || (Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    batch.set(doc(state.refs.tasksRef, id), {
      q: t.q || 'q1', text: t.text || '', note: t.note || '', tag: t.tag || 'other',
      done: !!t.done, createdAt: t.createdAt || Date.now(), completedAt: t.completedAt || null,
    });
  });
  return batch.commit();
}
