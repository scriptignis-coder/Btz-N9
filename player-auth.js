// Signed session for a REGULAR VISITOR who logged in with their own Kick
// account (separate from auth.js, which is the admin-only panel login).
// The cookie carries the player's real Kick identity, HMAC-signed with the
// same SESSION_SECRET already used for the admin session — a visitor can't
// forge "I'm ZaNouNi" by hand-editing the cookie.

const crypto = require('node:crypto');
const cookie = require('cookie');

const PLAYER_COOKIE = 'n9btz_player_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set.');
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

function createPlayerToken(player) {
  const data = Buffer.from(JSON.stringify({ id: player.id, username: player.username })).toString(
    'base64url'
  );
  const payload = `player.${data}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifyPlayerToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [role, data, ts, sig] = parts;
  if (role !== 'player') return null;
  const payload = `${role}.${data}.${ts}`;
  const expected = sign(payload);
  if (!timingSafeEqualStr(sig, expected)) return null;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed || !parsed.id || !parsed.username) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function getPlayer(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return verifyPlayerToken(cookies[PLAYER_COOKIE]);
}

function setPlayerCookie(res, player) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(PLAYER_COOKIE, createPlayerToken(player), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    })
  );
}

function clearPlayerCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(PLAYER_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

module.exports = {
  PLAYER_COOKIE,
  getPlayer,
  setPlayerCookie,
  clearPlayerCookie,
};
