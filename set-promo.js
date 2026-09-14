const { requireAdmin } = require('./auth');
const { setProductPromo } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const id = Number.parseInt(req.body?.id, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Missing product id.' });
    return;
  }

  const raw = req.body?.promoPrice;
  const promoPrice = raw !== undefined && raw !== null && raw !== '' ? Number.parseInt(raw, 10) : null;
  if (promoPrice !== null && (!Number.isFinite(promoPrice) || promoPrice < 0)) {
    res.status(400).json({ error: 'Promo price must be a positive number.' });
    return;
  }

  try {
    const product = await setProductPromo(id, promoPrice);
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'db_unavailable', message: err.message });
  }
};
