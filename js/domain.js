/* ── domain ── derived data & business rules over tasks. Pure functions the
   view and store consume. ── */
import { ARCHIVE_MS } from './constants.js?v=3';

/* a task is archived when manually archived, or auto after ARCHIVE_MS done */
export function isArchived(t) {
  if (t.archived === true) return true;
  return t.done && t.completedAt && (Date.now() - t.completedAt) >= ARCHIVE_MS;
}

/* board ordering: explicit sortOrder first (ascending), then by creation time */
export function sortTasks(a, b) {
  if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
  if (a.sortOrder != null) return -1;
  if (b.sortOrder != null) return 1;
  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

/* live (non-archived) tasks for a quadrant, sorted for display */
export function quadrantTasks(tasks, q) {
  return tasks.filter(t => t.q === q && !isArchived(t)).sort(sortTasks);
}
