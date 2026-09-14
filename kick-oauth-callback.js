const cookie = require('cookie');
const { exchangeCode, getCurrentUser } = require('./kick-oauth');
const { setPlayerCookie } = require('./player-auth');
const { PENDING_COOKIE } = require('./kick-login');

function clearPending(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(PENDING_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query || {};
  const cookies = cookie.parse(req.headers.cookie || '');
  let pending = null;
  try {
    pending = JSON.parse(cookies[PENDING_COOKIE] || 'null');
  } catch (_) {
    pending = null;
  }

  if (error || !code || !pending || pending.state !== state) {
    clearPending(res);
    res.redirect(302, '/game?login=failed');
    return;
  }

  try {
    const tokens = await exchangeCode({ code, codeVerifier: pending.codeVerifier });
    const user = await getCurrentUser(tokens.access_token);
    clearPending(res);
    setPlayerCookie(res, user);
    res.redirect(302, '/game');
  } catch (err) {
    clearPending(res);
    res.redirect(302, '/game?login=failed');
  }
};
