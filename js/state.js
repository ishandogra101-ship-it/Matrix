/* ── state ── the app's mutable singletons. Data caches (tasks/categories/
   people/settings) are written by the store, which then emits on the bus so
   the view re-renders no matter who changed what. UI-only fields (editId,
   dragId, searchQ, activeTab) are mutated directly by their handlers. ── */
import { emit } from './bus.js';
import { DEFAULT_CATEGORIES } from './constants.js';

export const state = {
  /* data caches (owned by the store) */
  tasks: [],
  categories: [...DEFAULT_CATEGORIES],
  people: [],
  settings: { reminderEnabled: false, reminderFrequencyMs: 86_400_000, lastReminderSentAt: 0 },

  /* session */
  currentUser: null,
  refs: {},            // { tasksRef, categoriesRef, peopleRef, movementsRef, settingsRef }
  unsubTasks: null,
  firstSnap: true,
  cachedNextSendAt: null,

  /* UI-only */
  editId: null,
  deleteFn: null,
  dragId: null,
  searchQ: '',
  activeTab: 'q1',
};

/* setters that announce a data change so subscribed views refresh */
export function setTasks(list)   { state.tasks = list;        emit('tasks:changed'); }
export function setCategories(c) { state.categories = c;      emit('categories:changed'); }
export function setPeople(p)     { state.people = p;          emit('people:changed'); }
export function setSettings(s)   { state.settings = s;        emit('settings:changed'); }
