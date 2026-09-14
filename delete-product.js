const { deletePhoto } = require('./_lib/storage');
const { requireAdmin } = require('./_lib/auth');
const { deleteProduct, getProduct } = require('./_lib/db');

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

  try {
    const existing = await getProduct(id);
    const product = await deleteProduct(id);
    if (existing?.photo_url) {
      try {
        await deletePhoto(existing.photo_url);
      } catch {
        // best-effort cleanup — the DB row is already gone, ignore storage errors
      }
    }
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'db_unavailable', message: err.message });
  }
};
