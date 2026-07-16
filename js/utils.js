/* ── utils ── pure helpers, zero imports ── */

export function genId() { return Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* like esc but also escapes quotes — for values placed inside HTML attributes / emails */
export const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* up-to-two-letter initials from a name */
export function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/* Q1 priority gradient: rust (top / most urgent) → soft blue (bottom) */
export function lerpColor(t) {
  const r = [244, 63, 94], b = [147, 197, 253];
  return `rgb(${Math.round(r[0] + (b[0] - r[0]) * t)},${Math.round(r[1] + (b[1] - r[1]) * t)},${Math.round(r[2] + (b[2] - r[2]) * t)})`;
}
