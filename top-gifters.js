const chatListener = require('./chat-listener');
const db = require('./db');

const DAYS = 7;

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

  try {
    const rows = await db.topGifters(slug, DAYS, 10);
    res.status(200).json({
      streamer: slug,
      days: DAYS,
      available: true,
      gifters: rows.map((r) => ({ username: r.gifter_username, count: r.total })),
    });
  } catch (err) {
    // No DATABASE_URL yet, or the DB is briefly unreachable — the card just
    // shows "not available" instead of erroring the whole page.
    res.status(200).json({ streamer: slug, days: DAYS, available: false, gifters: [] });
  }
};
