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

// ---------- Gift-sub leaderboard ("Top gifters") ----------
// Kick doesn't expose gift-sub history through any API, official or
// unofficial — this only works because chat-listener.js sees each gift
// event live (over the same public chat feed used for Top Chatters) and
// records it here as it happens. Nothing is backfilled; the leaderboard
// only knows about gifts sent while the site was awake and listening.

async function ensureGiftEventsTable() {
  const sql = client();
  await sql`
    CREATE TABLE IF NOT EXISTS gift_events (
      id              SERIAL PRIMARY KEY,
      streamer        TEXT NOT NULL,
      gifter_username TEXT NOT NULL,
      quantity        INTEGER NOT NULL CHECK (quantity > 0),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS gift_events_streamer_idx ON gift_events (streamer, created_at)`;
}

async function recordGift({ streamer, gifterUsername, quantity }) {
  const sql = client();
  await sql`
    INSERT INTO gift_events (streamer, gifter_username, quantity)
    VALUES (${streamer}, ${gifterUsername}, ${quantity})
  `;
}

async function topGifters(streamer, days, limit) {
  const sql = client();
  return sql`
    SELECT gifter_username, SUM(quantity)::int AS total
    FROM gift_events
    WHERE streamer = ${streamer} AND created_at > now() - (${days} * INTERVAL '1 day')
    GROUP BY gifter_username
    ORDER BY total DESC
    LIMIT ${limit}
  `;
}

// ---------- Chkobba "who's the best" leaderboard ----------
// One row per Kick account that has ever played and won at least once —
// wins are only recorded for someone who actually logged in with Kick
// (player-auth.js), so the name on the board is their real Kick username.

async function ensureChkobbaWinsTable() {
  const sql = client();
  await sql`
    CREATE TABLE IF NOT EXISTS chkobba_wins (
      kick_user_id  TEXT PRIMARY KEY,
      username      TEXT NOT NULL,
      wins          INTEGER NOT NULL DEFAULT 0,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function recordChkobbaWin({ kickUserId, username }) {
  const sql = client();
  const rows = await sql`
    INSERT INTO chkobba_wins (kick_user_id, username, wins, updated_at)
    VALUES (${kickUserId}, ${username}, 1, now())
    ON CONFLICT (kick_user_id)
    DO UPDATE SET wins = chkobba_wins.wins + 1, username = ${username}, updated_at = now()
    RETURNING *
  `;
  return rows[0];
}

async function chkobbaLeaderboard(limit) {
  const sql = client();
  return sql`
    SELECT username, wins
    FROM chkobba_wins
    ORDER BY wins DESC, updated_at ASC
    LIMIT ${limit}
  `;
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
  ensureGiftEventsTable,
  recordGift,
  topGifters,
  ensureChkobbaWinsTable,
  recordChkobbaWin,
  chkobbaLeaderboard,
};
