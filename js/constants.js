/* ── constants ── app-wide defaults and palettes. No imports, no side effects. ── */

/* selectable category colours (bg + text), cycled in the category modal */
export const COLOR_PRESETS = [
  { bg: '#e4efff', color: '#1a4a9a' }, { bg: '#f3eef8', color: '#5c1a7a' },
  { bg: '#d6f7e8', color: '#047857' }, { bg: '#f4f5fc', color: '#73769e' },
  { bg: '#ffe3e9', color: '#be123c' }, { bg: '#fef4d8', color: '#b45309' },
  { bg: '#ddf3fe', color: '#0369a1' }, { bg: '#fbe6fd', color: '#a21caf' },
];

export const DEFAULT_CATEGORIES = [
  { id: 'work',     label: 'Work',     bg: '#e4efff', color: '#1a4a9a' },
  { id: 'personal', label: 'Personal', bg: '#f3eef8', color: '#5c1a7a' },
  { id: 'health',   label: 'Health',   bg: '#d6f7e8', color: '#047857' },
  { id: 'other',    label: 'Other',    bg: '#f4f5fc', color: '#73769e' },
];

/* People you can delegate to. "Self" is always available implicitly. */
export const PERSON_COLORS = ['#00205B', '#C8102E', '#00875A', '#B45309', '#5B21B6', '#0369A1', '#A21CAF', '#0F766E'];
export const SELF_PERSON   = { id: 'self', name: 'Self', color: '#00205B' };

/* auto-archive completed tasks after this long */
export const ARCHIVE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const QUADRANTS = ['q1', 'q2', 'q3', 'q4'];
