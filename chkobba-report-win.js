const { getPlayer } = require('./player-auth');
const db = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const player = getPlayer(req);
  if (!player) {
    res.status(401).json({ error: 'not_logged_in' });
    return;
  }
  try {
    const row = await db.recordChkobbaWin({ kickUserId: player.id, username: player.username });
    res.status(200).json({ ok: true, wins: row.wins });
  } catch (err) {
    res.status(200).json({ ok: false }); // DB hiccup — the win just isn't counted this time
  }
};
