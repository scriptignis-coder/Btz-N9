const { checkCredentials, setSessionCookie } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { username, password } = req.body || {};

  let ok = false;
  try {
    ok = checkCredentials(username, password);
  } catch (err) {
    res.status(500).json({ error: 'config', message: err.message });
    return;
  }

  if (!ok) {
    res.status(401).json({ error: 'invalid' });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
};
