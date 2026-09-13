-- THE N9 & BTZ — product catalogue schema
-- Run this once against your Neon/Vercel Postgres database (Vercel dashboard
-- -> Storage -> your database -> Query, or `psql "$DATABASE_URL" -f scripts/schema.sql`).

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  category      TEXT NOT NULL CHECK (category IN ('hoodies', 'joggers', 'shorts', 'caps', 'accessories')),
  gender        TEXT NOT NULL CHECK (gender IN ('men', 'women')),
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL CHECK (price >= 0),          -- DT, whole dinars
  promo_price   INTEGER CHECK (promo_price IS NULL OR promo_price >= 0),
  in_stock      BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
