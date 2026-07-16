/* ── migration ── one-time import of tasks left in localStorage by the
   pre-Firestore version. Shows a banner; imports on confirm. ── */
import { emit } from './bus.js';
import { importLegacyTasks } from './store.js';

async function importLegacy(oldTasks, banner) {
  try {
    await importLegacyTasks(oldTasks);
    localStorage.removeItem('matrix_v1');
    banner.style.display = 'none';
    emit('toast', `Imported ${oldTasks.length} task${oldTasks.length > 1 ? 's' : ''} ✓`);
  } catch { emit('toast', 'Import failed — please try again'); }
}

export function checkMigration() {
  try {
    const raw = localStorage.getItem('matrix_v1');
    if (!raw) return;
    const old = JSON.parse(raw);
    if (!Array.isArray(old) || !old.length) return;
    const banner = document.getElementById('migration-banner');
    banner.style.display = 'flex';
    document.getElementById('mig-import').addEventListener('click', () => importLegacy(old, banner), { once: true });
    document.getElementById('mig-dismiss').addEventListener('click', () => {
      banner.style.display = 'none';
      localStorage.removeItem('matrix_v1');
    }, { once: true });
  } catch { /* ignore */ }
}
