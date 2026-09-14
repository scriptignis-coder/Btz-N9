const { uploadPhoto } = require('./_lib/storage');
const { requireAdmin } = require('./_lib/auth');
const { CATEGORY_IDS, getAllProducts, getProductsByCategory, insertProduct } = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Public read — anyone visiting the shop can see the catalogue.
    const category = req.query?.category;
    try {
      const products =
        category && category !== 'all' ? await getProductsByCategory(category) : await getAllProducts();
      res.status(200).json({ products });
    } catch (err) {
      res.status(500).json({ error: 'db_unavailable', message: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const body = req.body || {};
    const category = String(body.category || '');
    const gender = String(body.gender || '');
    const name = String(body.name || '').trim();
    const price = Number.parseInt(body.price, 10);
    const promoPrice =
      body.promoPrice !== undefined && body.promoPrice !== null && body.promoPrice !== ''
        ? Number.parseInt(body.promoPrice, 10)
        : null;
    const inStock = Boolean(body.inStock);

    if (!CATEGORY_IDS.includes(category)) {
      res.status(400).json({ error: 'Unknown category.' });
      return;
    }
    if (gender !== 'men' && gender !== 'women') {
      res.status(400).json({ error: 'Gender must be men or women.' });
      return;
    }
    if (!name) {
      res.status(400).json({ error: 'Name is required.' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: 'Price must be a positive number.' });
      return;
    }
    if (promoPrice !== null && (!Number.isFinite(promoPrice) || promoPrice < 0)) {
      res.status(400).json({ error: 'Promo price must be a positive number.' });
      return;
    }

    let photoUrl = null;
    if (body.photoBase64) {
      const buffer = Buffer.from(body.photoBase64, 'base64');
      if (buffer.length > 4 * 1024 * 1024) {
        res.status(400).json({ error: 'Photo is too large — keep it under 4 MB.' });
        return;
      }
      try {
        photoUrl = await uploadPhoto(body.photoBase64, body.photoContentType || 'image/jpeg');
      } catch (err) {
        res.status(500).json({ error: 'upload_failed', message: err.message });
        return;
      }
    }

    try {
      const product = await insertProduct({
        category,
        gender,
        name,
        price,
        promoPrice,
        inStock,
        photoUrl,
      });
      res.status(201).json({ product });
    } catch (err) {
      res.status(500).json({ error: 'db_unavailable', message: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
