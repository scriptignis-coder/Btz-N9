const { requireAdmin } = require('./auth');
const { setProductStock } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const id = Number.parseInt(req.body?.id, 10);
  const inStock = Boolean(req.body?.inStock);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Missing product id.' });
    return;
  }

  try {
    const product = await setProductStock(id, inStock);
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'db_unavailable', message: err.message });
  }
};
