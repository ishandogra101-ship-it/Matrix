/* ── reminders ── background email reminders via a Firestore doc that Power
   Automate polls (subject/html_body/nextSendAt). Builds the Outlook email and
   keeps the pending-notification doc in sync. ── */
import { db, doc, setDoc, getDoc } from './firebase.js';
import { state } from './state.js';
import { escHtml, fmtDate } from './utils.js';
import { getCatLabel } from './templates.js';

const NOTIFICATIONS_CONFIGURED = true;

export const PRESET_VALS = ['2m', '5m', '15m', '30m', '1', '4', '8', '24', '2d', '3d', '7d'];

export function freqToMs(val) {
  if (val.endsWith('m')) return parseInt(val) * 60_000;
  if (val.endsWith('d')) return parseInt(val) * 86_400_000;
  return parseInt(val) * 3_600_000;
}
export function msToLabel(ms) {
  if (ms < 3_600_000)  return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)} day${Math.round(ms / 86_400_000) !== 1 ? 's' : ''}`;
}
export function getFreqMs() {
  return state.settings.reminderFrequencyMs
    || (state.settings.reminderFrequencyHours ? state.settings.reminderFrequencyHours * 3_600_000 : 86_400_000);
}

export function buildReminderEmail(taskList) {
  const count  = taskList.length;
  const plural = count === 1 ? '' : 's';
  const date   = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const appUrl = window.location.origin + window.location.pathname;

  const rows = taskList.map((t, i) => {
    const sep = i < taskList.length - 1 ? 'border-bottom:1px solid #EEF2F8;' : '';
    return `<tr><td style="padding:14px 0 14px 16px;border-left:3px solid #C8102E;${sep}">
      <div style="font-size:14px;font-weight:600;color:#0D1526;line-height:1.4;margin-bottom:6px;">${escHtml(t.text)}</div>
      <span style="display:inline-block;background:#FEF0F2;color:#C8102E;font-size:11px;font-weight:600;
                   padding:2px 8px;border-radius:20px;">${escHtml(getCatLabel(t.tag || 'other'))}</span>
      ${t.createdAt ? `<span style="font-size:11px;color:#9BAABB;margin-left:8px;">Added ${fmtDate(t.createdAt)}</span>` : ''}
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matrix Reminder</title></head>
<body style="margin:0;padding:0;background:#EEF2FA;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EEF2FA">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;">

  <tr><td style="background:#00205B;border-radius:10px 10px 0 0;padding:28px 32px;">
    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.45);letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;">MARUTI MATRIX</div>
    <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;">${count} Q1 task${plural} pending</div>
    <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.55);">Urgent &amp; Important &nbsp;&middot;&nbsp; ${date}</div>
  </td></tr>

  <tr><td style="background:#ffffff;padding:24px 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>

  <tr><td style="background:#ffffff;padding:20px 32px 28px;text-align:center;">
    <a href="${escHtml(appUrl)}" style="display:inline-block;background:#00205B;color:#ffffff;
       font-family:'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;
       text-decoration:none;padding:12px 32px;border-radius:7px;">Open Matrix &rarr;</a>
  </td></tr>

  <tr><td style="background:#F5F7FC;border-top:1px solid #E4EAF5;border-radius:0 0 10px 10px;
                 padding:16px 32px;text-align:center;">
    <div style="font-size:11px;color:#9BAABB;line-height:1.8;">
      Reminders are enabled for your Matrix account.<br>
      To change frequency, open <strong>Reminders</strong> in the sidebar.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* keep the pending-notification doc current so Power Automate can send even
   when the app is closed. Called on first snapshot and after a settings save. */
export async function syncNotifDoc(sendImmediately = false) {
  if (!NOTIFICATIONS_CONFIGURED || !state.currentUser) return;
  try {
    const notifRef = doc(db, 'notifications', 'pending');
    const open     = state.tasks.filter(t => t.q === 'q1' && !t.done);
    const freqMs   = getFreqMs();
    const enabled  = !!state.settings.reminderEnabled;

    let nextSendAt;
    if (sendImmediately) {
      nextSendAt = new Date().toISOString(); // past = PA sends on next poll
    } else {
      const snap = await getDoc(notifRef);
      const existing = snap.exists() ? snap.data().nextSendAt : null;
      nextSendAt = existing && new Date(existing) > new Date()
        ? existing
        : new Date(Date.now() + freqMs).toISOString();
    }
    state.cachedNextSendAt = nextSendAt;

    await setDoc(notifRef, {
      to_email:            state.currentUser.email,
      subject:             `Matrix: ${open.length} Q1 task${open.length !== 1 ? 's' : ''} need your attention`,
      html_body:           open.length ? buildReminderEmail(open) : '',
      tasks_count:         open.length,
      reminderEnabled:     enabled,
      reminderFrequencyMs: freqMs,
      nextSendAt,
    });
  } catch (e) { console.error('syncNotifDoc failed:', e); }
}
