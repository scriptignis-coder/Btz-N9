const { neon } = require('@neondatabase/serverless');

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Create a free database at neon.tech and add its connection string as an environment variable.'
    );
  }
  return neon(url);
}

const CATEGORIES = [
  { id: 'hoodies', label: 'Hoodies & Tops' },
  { id: 'joggers', label: 'Joggers & Sweatpants' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'caps', label: 'Caps' },
  { id: 'accessories', label: 'Accessories' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

async function getAllProducts() {
  const sql = client();
  return sql`SELECT * FROM products ORDER BY created_at DESC`;
}

async function getProductsByCategory(category) {
  const sql = client();
  return sql`
    SELECT * FROM products
    WHERE category = ${category}
    ORDER BY created_at DESC
  `;
}

async function insertProduct({ category, gender, name, price, promoPrice, inStock, photoUrl }) {
  const sql = client();
  const rows = await sql`
    INSERT INTO products (category, gender, name, price, promo_price, in_stock, photo_url)
    VALUES (${category}, ${gender}, ${name}, ${price}, ${promoPrice}, ${inStock}, ${photoUrl})
    RETURNING *
  `;
  return rows[0];
}

async function setProductStock(id, inStock) {
  const sql = client();
  const rows = await sql`UPDATE products SET in_stock = ${inStock} WHERE id = ${id} RETURNING *`;
  return rows[0];
}

async function setProductPromo(id, promoPrice) {
  const sql = client();
  const rows = await sql`
    UPDATE products SET promo_price = ${promoPrice} WHERE id = ${id} RETURNING *
  `;
  return rows[0];
}

async function deleteProduct(id) {
  const sql = client();
  const rows = await sql`DELETE FROM products WHERE id = ${id} RETURNING *`;
  return rows[0];
}

async function getProduct(id) {
  const sql = client();
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
  return rows[0];
}

module.exports = {
  CATEGORIES,
  CATEGORY_IDS,
  getAllProducts,
  getProductsByCategory,
  insertProduct,
  setProductStock,
  setProductPromo,
  deleteProduct,
  getProduct,
};
