/* ── login ── standalone auth page: sign in / create account / reset. Uses the
   shared firebase.js seam. Restricts to @maruti.co.in accounts. ── */
import {
  configured, auth, db, doc, setDoc, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
} from './firebase.js?v=3';

const $ = id => document.getElementById(id);

if (!configured) {
  document.querySelector('.login-card').innerHTML = `
    <div class="login-brand"><div class="brand-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill="white"/><rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5" fill="white" opacity="0.55"/><rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5" fill="white" opacity="0.55"/><rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5" fill="white" opacity="0.25"/></svg></div><div class="login-brand-name">Matrix</div></div>
    <div class="login-title" style="font-size:17px;">Firebase setup required</div>
    <div class="login-sub">Open <code style="background:var(--paper2);padding:2px 6px;border-radius:5px;font-size:12px;">firebase-config.js</code> and fill in your Firebase project credentials. See the comments in that file for step-by-step instructions.</div>`;
  throw new Error('Firebase not configured');
}

const BASE = window.MATRIX_BASE || './';   // app root; '../' for the clean-URL folder copy

onAuthStateChanged(auth, user => { if (user) window.location.href = BASE; });

function isMarutiEmail(e) { return /^[^\s@]+@maruti\.co\.in$/i.test(e); }

function showErr(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setBusy(btnId, busy) {
  const btn = $(btnId);
  btn.disabled = busy;
  btn.textContent = busy ? 'Please wait…' : btn.getAttribute('data-label');
}

function showView(name) {
  ['signin', 'create', 'forgot'].forEach(v => {
    $('view-' + v).style.display = v === name ? '' : 'none';
  });
  ['signin-err', 'create-err', 'forgot-err'].forEach(id => showErr(id, ''));
  $('forgot-ok').style.display = 'none';
}

$('goto-create').addEventListener('click',  () => showView('create'));
$('goto-signin').addEventListener('click',  () => showView('signin'));
$('goto-signin2').addEventListener('click', () => showView('signin'));
$('forgot-link').addEventListener('click',  () => showView('forgot'));

/* ── Sign in ── */
$('signin-btn').addEventListener('click', async () => {
  const email = $('signin-email').value.trim();
  const pass  = $('signin-pass').value;
  showErr('signin-err', '');
  if (!email || !pass) { showErr('signin-err', 'Please fill in all fields.'); return; }
  if (!isMarutiEmail(email)) { showErr('signin-err', 'Only @maruti.co.in email addresses are allowed.'); return; }
  setBusy('signin-btn', true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = BASE;
  } catch (e) {
    showErr('signin-err', friendlyError(e.code));
    setBusy('signin-btn', false);
  }
});
$('signin-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('signin-btn').click();
});

/* ── Create account ── */
$('create-btn').addEventListener('click', async () => {
  const email = $('create-email').value.trim();
  const pass  = $('create-pass').value;
  const pass2 = $('create-pass2').value;
  showErr('create-err', '');
  if (!email || !pass || !pass2) { showErr('create-err', 'Please fill in all fields.'); return; }
  if (!isMarutiEmail(email))     { showErr('create-err', 'Only @maruti.co.in email addresses are allowed.'); return; }
  if (pass.length < 6)           { showErr('create-err', 'Password must be at least 6 characters.'); return; }
  if (pass !== pass2)            { showErr('create-err', 'Passwords do not match.'); return; }
  setBusy('create-btn', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, 'users', cred.user.uid, 'settings', 'prefs'), {
      reminderEnabled: false, reminderFrequencyHours: 24, lastReminderSentAt: 0,
    });
    window.location.href = BASE;
  } catch (e) {
    showErr('create-err', friendlyError(e.code));
    setBusy('create-btn', false);
  }
});

/* ── Forgot password ── */
$('forgot-btn').addEventListener('click', async () => {
  const email = $('forgot-email').value.trim();
  showErr('forgot-err', '');
  $('forgot-ok').style.display = 'none';
  if (!email) { showErr('forgot-err', 'Please enter your email address.'); return; }
  if (!isMarutiEmail(email)) { showErr('forgot-err', 'Only @maruti.co.in email addresses are allowed.'); return; }
  setBusy('forgot-btn', true);
  try {
    await sendPasswordResetEmail(auth, email);
    $('forgot-ok').style.display = 'block';
  } catch (e) {
    showErr('forgot-err', friendlyError(e.code));
  }
  setBusy('forgot-btn', false);
});

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':          return 'Invalid email address.';
    case 'auth/user-not-found':         return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':     return 'Incorrect email or password.';
    case 'auth/email-already-in-use':   return 'An account with this email already exists.';
    case 'auth/weak-password':          return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error — check your connection.';
    default:                            return 'Something went wrong. Please try again.';
  }
}
