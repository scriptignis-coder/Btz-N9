const { getPlayer } = require('./player-auth');

module.exports = async (req, res) => {
  const player = getPlayer(req);
  res.status(200).json({ player: player ? { id: player.id, username: player.username } : null });
};
