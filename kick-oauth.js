// "Login with Kick" — Kick's OFFICIAL OAuth Authorization Code + PKCE flow
// (id.kick.com), used ONLY so a visitor can prove their own Kick identity
// to play the Chkobba game under their real username on the leaderboard.
// This is a completely different, fully-documented flow from the
// unofficial chat feed used for Top Chatters/Gifters — it needs the site's
// existing Kick Developer App to also have the "user:read" scope enabled
// and the callback URL registered (see README).

const crypto = require('node:crypto');

const AUTHORIZE_URL = 'https://id.kick.com/oauth/authorize';
const TOKEN_URL = 'https://id.kick.com/oauth/token';
const USER_URL = 'https://api.kick.com/public/v1/users';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier() {
  return base64url(crypto.randomBytes(48)); // 64 chars, within PKCE's 43-128 range
}

function challengeFor(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

function redirectUri() {
  const base = process.env.SITE_URL;
  if (!base) throw new Error('SITE_URL is not set (needed to build the Kick OAuth redirect URI).');
  return base.replace(/\/+$/, '') + '/api/kick-oauth-callback';
}

function buildAuthorizeUrl({ state, codeVerifier }) {
  const clientId = process.env.KICK_CLIENT_ID;
  if (!clientId) throw new Error('kick_not_configured');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri(),
    scope: 'user:read',
    state,
    code_challenge: challengeFor(codeVerifier),
    code_challenge_method: 'S256',
  });
  return AUTHORIZE_URL + '?' + params.toString();
}

async function exchangeCode({ code, codeVerifier }) {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('kick_not_configured');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      code,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error('kick_token_exchange_failed');
  return res.json(); // { access_token, refresh_token, expires_in, token_type }
}

async function getCurrentUser(accessToken) {
  const res = await fetch(USER_URL, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!res.ok) throw new Error('kick_user_fetch_failed');
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data[0] : Array.isArray(json) ? json[0] : json;
  if (!raw) throw new Error('kick_user_empty');
  const id = raw.user_id ?? raw.id;
  const username = raw.name ?? raw.username ?? raw.slug;
  if (!id || !username) throw new Error('kick_user_shape_unexpected');
  return { id: String(id), username: String(username), profilePicture: raw.profile_picture || null };
}

module.exports = {
  randomVerifier,
  buildAuthorizeUrl,
  exchangeCode,
  getCurrentUser,
};
