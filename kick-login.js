const crypto = require('node:crypto');
const cookie = require('cookie');
const { randomVerifier, buildAuthorizeUrl } = require('./kick-oauth');

const PENDING_COOKIE = 'n9btz_oauth_pending';

module.exports = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = randomVerifier();
    const url = buildAuthorizeUrl({ state, codeVerifier });

    res.setHeader(
      'Set-Cookie',
      cookie.serialize(PENDING_COOKIE, JSON.stringify({ state, codeVerifier }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes — plenty for the Kick login round trip
      })
    );
    res.redirect(302, url);
  } catch (err) {
    res.status(500).send('Kick login isn\'t configured yet — missing KICK_CLIENT_ID or SITE_URL.');
  }
};

module.exports.PENDING_COOKIE = PENDING_COOKIE;
