const db = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const rows = await db.chkobbaLeaderboard(10);
    res.status(200).json({ available: true, leaderboard: rows });
  } catch (err) {
    res.status(200).json({ available: false, leaderboard: [] });
  }
};
