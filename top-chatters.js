const chatListener = require('./chat-listener');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const slug = String(req.query.streamer || '');
  if (!chatListener.SLUGS.includes(slug)) {
    res.status(400).json({ error: 'unknown_streamer' });
    return;
  }

  const status = chatListener.getStatus(slug) || { is_live: false, tracking: false };
  res.status(200).json({
    streamer: slug,
    is_live: status.is_live,
    tracking: status.tracking,
    chatters: chatListener.topChatters(slug, 10),
  });
};
