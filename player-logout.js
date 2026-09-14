const { clearPlayerCookie } = require('./player-auth');

module.exports = async (req, res) => {
  clearPlayerCookie(res);
  if (req.method === 'GET') {
    res.redirect(302, '/game');
    return;
  }
  res.status(200).json({ ok: true });
};
