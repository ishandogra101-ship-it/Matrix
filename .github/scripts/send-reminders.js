'use strict';

const admin = require('firebase-admin');

/* ── Init ── */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db      = admin.firestore();
const auth    = admin.auth();
const PA_URL  = process.env.POWER_AUTOMATE_URL;
const APP_URL = process.env.APP_URL || 'https://matrix-feb00.web.app';

if (!PA_URL || PA_URL === 'YOUR_POWER_AUTOMATE_URL') {
  console.error('POWER_AUTOMATE_URL secret is not set.');
  process.exit(1);
}

const DEFAULT_CATEGORIES = [
  { id: 'work',     label: 'Work'     },
  { id: 'personal', label: 'Personal' },
  { id: 'health',   label: 'Health'   },
  { id: 'other',    label: 'Other'    },
];

/* ── Helpers ── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function getCatLabel(cats, id) {
  const c = cats.find(x => x.id === id);
  return c ? c.label : id;
}

/* ── Email builder ── */
function buildEmail(taskList, categories) {
  const count  = taskList.length;
  const plural = count === 1 ? '' : 's';
  const date   = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const cards = taskList.map(t => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:10px;border:1.5px solid #e6e8f6;border-left:3px solid #f43f5e;
                  border-radius:10px;background:#f6f7fd;">
      <tr><td style="padding:10px 14px;">
        <div style="font-size:13.5px;font-weight:600;color:#15162b;line-height:1.4;">${escHtml(t.text)}</div>
        <div style="margin-top:5px;">
          <span style="display:inline-block;background:#ffe3e9;color:#be123c;padding:1px 7px;
                       border-radius:100px;font-size:9px;font-weight:700;text-transform:uppercase;
                       letter-spacing:.06em;">${escHtml(getCatLabel(categories, t.tag || 'other'))}</span>
          ${t.createdAt ? `<span style="font-size:11px;color:#a3a7c9;margin-left:6px;">Added ${fmtDate(t.createdAt)}</span>` : ''}
        </div>
      </td></tr>
    </table>`).join('');

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><title>Matrix Reminder</title></head>
<body style="margin:0;padding:0;background:#eef0fb;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0fb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="background:#6366f1;background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);
                 border-radius:16px 16px 0 0;padding:28px 28px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:rgba(255,255,255,.2);border-radius:9px;width:34px;height:34px;
                 text-align:center;vertical-align:middle;font-size:16px;color:white;">&#8862;</td>
      <td style="padding-left:10px;font-size:19px;font-weight:700;color:white;">Matrix</td>
    </tr></table>
    <div style="margin-top:18px;font-size:22px;font-weight:700;color:white;line-height:1.25;">
      &#128293; ${count} urgent task${plural} need${count === 1 ? 's' : ''} attention</div>
    <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.7);">
      Q1 &middot; Urgent &amp; Important &middot; ${date}</div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:20px 24px 12px;">${cards}</td></tr>
  <tr><td style="background:#f4f5fc;border-radius:0 0 16px 16px;padding:24px;
                 text-align:center;border-top:1px solid #e6e8f6;">
    <a href="${APP_URL}"
       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);
              color:white;text-decoration:none;font-weight:700;font-size:14px;
              padding:13px 32px;border-radius:100px;">Open Matrix App &rarr;</a>
    <div style="margin-top:16px;font-size:11px;color:#a3a7c9;line-height:1.6;">
      You're receiving this because email reminders are enabled in your Matrix account.<br>
      Change frequency under <strong>Reminders</strong> in the sidebar.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* ── List all Firebase Auth users (handles pagination) ── */
async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

/* ── Main ── */
async function main() {
  const now   = Date.now();
  const users = await listAllUsers();
  console.log(`Checking ${users.length} user(s)…`);

  let sent = 0, skipped = 0, errors = 0;

  for (const userRecord of users) {
    const uid   = userRecord.uid;
    const email = userRecord.email;
    if (!email) { skipped++; continue; }

    try {
      /* Settings */
      const settingsSnap = await db.doc(`users/${uid}/settings/prefs`).get();
      if (!settingsSnap.exists) { skipped++; continue; }
      const settings = settingsSnap.data();
      if (!settings.reminderEnabled) { skipped++; continue; }

      const freqMs = (settings.reminderFrequencyHours || 24) * 3_600_000;
      if (now - (settings.lastReminderSentAt || 0) < freqMs) { skipped++; continue; }

      /* Open Q1 tasks */
      const tasksSnap = await db.collection(`users/${uid}/tasks`)
        .where('q', '==', 'q1')
        .where('done', '==', false)
        .get();
      if (tasksSnap.empty) { skipped++; continue; }
      const taskList = tasksSnap.docs.map(d => d.data());

      /* Categories */
      let categories = [...DEFAULT_CATEGORIES];
      const catSnap = await db.doc(`users/${uid}/categories/list`).get();
      if (catSnap.exists && catSnap.data().items?.length) {
        categories = catSnap.data().items;
      }

      /* Send via Power Automate */
      const subject  = `🔥 Matrix: ${taskList.length} Q1 task${taskList.length > 1 ? 's' : ''} need attention`;
      const htmlBody = buildEmail(taskList, categories);

      const res = await fetch(PA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: email, subject, html_body: htmlBody }),
      });
      if (!res.ok) throw new Error(`Power Automate returned HTTP ${res.status}`);

      /* Update lastReminderSentAt */
      await db.doc(`users/${uid}/settings/prefs`).update({ lastReminderSentAt: now });

      console.log(`  ✓ Sent to ${email} — ${taskList.length} task(s)`);
      sent++;

    } catch (err) {
      console.error(`  ✗ ${email}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone — sent: ${sent}  skipped: ${skipped}  errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main();
