const crypto = require('node:crypto');
const cookie = require('cookie');

const SESSION_COOKIE = 'n9btz_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Add it as an environment variable (any long random string).'
    );
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionToken() {
  const payload = `admin.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, ts, sig] = parts;
  if (role !== 'admin') return false;
  const payload = `${role}.${ts}`;
  const expected = sign(payload);
  if (!timingSafeEqualStr(sig, expected)) return false;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) return false;
  return true;
}

function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  if (!expectedUser || !expectedPass) {
    throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD are not set as environment variables.');
  }
  const userOk = timingSafeEqualStr(username, expectedUser);
  const passOk = timingSafeEqualStr(password, expectedPass);
  return userOk && passOk;
}

/** Reads the request's cookies and reports whether they carry a valid admin session.
 * Call this at the top of EVERY admin API route — a route can be hit directly with a
 * POST request regardless of what the admin page's UI shows, so the UI is never the guard. */
function isAdminRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

function setSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

/** Sends a 401 and returns false when the request isn't an admin session; otherwise returns true.
 * Usage: `if (!requireAdmin(req, res)) return;` at the top of a handler. */
function requireAdmin(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

module.exports = {
  SESSION_COOKIE,
  checkCredentials,
  isAdminRequest,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
};
