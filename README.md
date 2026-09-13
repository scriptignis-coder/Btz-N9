# THE N9 & BTZ — site (plain HTML/CSS + Vercel serverless functions)

A real, plain website for ZaNouNi & B_b10 — genuine `.html`/`.css`/`.js`
files you can open and edit directly — with a password-protected admin
panel backed by a real database and photo storage. No framework (no React,
no build step): what you see in the files is exactly what ships.

This project is meant to be pushed to GitHub and deployed on **Vercel**,
with a Postgres database (Neon, via Vercel's built-in integration) and
Vercel Blob for photo uploads.

## 1. How it's put together

- **`public/`** — the actual site: plain `.html` pages, one shared
  `styles.css`, and a few small `.js` files. This is what a visitor's
  browser downloads directly.
- **`api/`** — small serverless functions (plain Node `.js`, one file =
  one endpoint) that Vercel runs on its servers, never in the browser.
  This is where the admin login check, the database queries, and the
  photo upload happen — so the password and the database connection are
  never exposed to visitors.

```
public/
  index.html              Home page (roster, schedule, shop grid)
  styles.css               THE N9 & BTZ design (colors, fonts, layout)
  shop.html                 Shop category template (Men/Women, live stock)
  admin/index.html           Admin panel (protected)
  admin/login/index.html      Sign-in form
  js/
    shop.js                   Loads products into shop.html
    admin.js                   Admin panel logic
    admin-login.js              Login form logic
api/
  login.js / logout.js / session.js     Auth
  products.js                            List products (public) / add one (admin)
  toggle-stock.js / set-promo.js / delete-product.js   Admin actions
  _lib/auth.js, _lib/db.js               Shared helpers (not public routes)
scripts/schema.sql                       Run once to create the products table
vercel.json                              Clean URLs + the /shop/:category route
```

**Promo price**: when a product has a promo price set, the shop page shows
the original price with a line through it and the promo price next to it
(e.g. ~~200 DT~~ **50 DT**).

**Security note**: there is a single admin account (no separate users). The
username and password are not stored in the code — they live in Vercel's
environment variables. Every `/api/*` write route independently checks the
login cookie itself (not just what the page shows), so it can't be
bypassed by calling the site directly.

## 2. Deploying — step by step

### a) Put the code on GitHub

```bash
git init
git add .
git commit -m "THE N9 & BTZ"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### b) Import into Vercel

1. Go to [vercel.com](https://vercel.com), sign in, click **Add New →
   Project**, and pick the repository you just pushed.
2. Vercel will detect this as a plain static project with API functions —
   leave the settings as they are and click **Deploy** once (it will fail
   the first time because the database isn't attached yet — that's
   expected, continue below).

### c) Add a Postgres database

1. In your Vercel project, go to **Storage** → **Create Database** →
   choose **Neon** (Postgres).
2. Click **Connect** to your project — Vercel adds the `DATABASE_URL`
   environment variable automatically.
3. Open the database's **Query** tab (or connect with `psql`) and run the
   contents of [`scripts/schema.sql`](./scripts/schema.sql) once. This
   creates the `products` table.

### d) Add Blob storage (for product photos)

1. Still in **Storage**, click **Create Database** again → choose **Blob**.
2. Connect it to your project — Vercel adds `BLOB_READ_WRITE_TOKEN`
   automatically.

### e) Set the admin login and session secret

In **Settings → Environment Variables**, add:

| Name             | Value                                              |
| ---------------- | --------------------------------------------------- |
| `ADMIN_USERNAME` | any username you want to log in with                |
| `ADMIN_PASSWORD` | a strong password                                    |
| `SESSION_SECRET` | a long random string — generate one with `openssl rand -hex 32`, or any password generator |

### f) Redeploy

Go to **Deployments**, open the latest one, and click **Redeploy** (or just
push a new commit). The site should now build successfully.

Your site is live at the `*.vercel.app` URL Vercel gives you (add a custom
domain later under **Settings → Domains**).

## 3. Using the admin panel

Visit `your-site.vercel.app/admin` (also linked from the site's nav bar and
footer). Sign in with the username/password from step (e):

- **Add a product**: category, Men/Women section, name, price, optional
  promo price, a photo (max 4 MB), and whether it's in stock.
- **Toggle stock**: click the "In stock" / "Out of stock" pill to flip it —
  updates the shop page instantly.
- **Promo price**: type a number and click **Set**; clear the box and
  click **Set** to remove a promo.
- **Delete**: removes the product (and its uploaded photo) for good.

## 4. Adding real photos to the site itself

The roster and schedule sections currently show placeholder tiles with the
streamers' names instead of photos (no image files were included in this
handoff). To add real ones:

1. Drop your images into `public/photos/` (create the folder), e.g.
   `roster-left.jpg`, `roster-right.jpg`.
2. In `public/index.html`, replace the `<span class="placeholder-tag">…</span>`
   inside each `.roster-row-photo` and `.schedule-photo` with an `<img>`
   tag, e.g. `<img src="/photos/roster-left.jpg" alt="ZaNouNi">`.

Product photos don't need this — they're uploaded straight from the admin
panel and stored in Vercel Blob.

## 5. Local development

Install the Vercel CLI once (`npm i -g vercel`), then from this folder:

```bash
npm install
vercel login          # first time only
vercel link            # first time only, links this folder to a Vercel project
vercel env pull .env.local   # pulls DATABASE_URL / BLOB_READ_WRITE_TOKEN from the project
vercel dev
```

`vercel dev` runs both the static files and the `/api` functions locally,
exactly like production. You'll still need `ADMIN_USERNAME`,
`ADMIN_PASSWORD` and `SESSION_SECRET` in `.env.local` (see
`.env.example`) — `vercel env pull` only fetches variables already saved
on the Vercel project, so add those three there first (step e) if you
haven't yet.

## 6. Editing the site

Every page is a real `.html` file with a `<link>` to `/styles.css` — open
any file in `public/` and edit it directly, no build step, no compiling.
`styles.css` holds every color and font as a CSS variable at the very top
(`:root { --bg: …; --accent: …; }`) if you want to retheme anything.
