# THE N9 & BTZ — site (Render + GitLab, no Vercel/Netlify)

A real Node.js website for ZaNouNi & B_b10 — plain `.html`/`.css` pages, a
small Express server, a password-protected admin panel, a real database,
and real photo uploads. Built to deploy on **Render**, with code hosted on
**GitLab**, a free **Neon** Postgres database, and free **Cloudinary**
photo storage — no Vercel, no Netlify.

## 1. Accounts you'll need (all free)

| Service | What it's for | Sign up at |
| --- | --- | --- |
| GitLab | holds the code | gitlab.com |
| Render | runs the site | render.com |
| Neon | the database (products) | neon.tech |
| Cloudinary | stores product photos | cloudinary.com |

Sign up for all four with a real email (verify it) — that avoids the kind
of account-flag issue you hit with GitHub.

## 2. Put the code on GitLab

You already did this part if you followed along — if not:

1. Create a new project on gitlab.com (**Create new project → Create blank
   project**), name it e.g. `n9btz-site`.
2. On the project page, **Upload File** (or the **+** menu) and drag in
   everything from this folder (`server.js`, `package.json`, `public/`,
   `api/`, `scripts/`, `README.md`, `.gitignore`, `.env.example`) — not
   `node_modules` if it exists locally.
3. Commit.

## 3. Create the database (Neon)

1. Sign up at **neon.tech**, create a new project.
2. On the project dashboard, copy the **connection string** (starts with
   `postgresql://...`) — this is your `DATABASE_URL`.
3. Open Neon's **SQL Editor** and paste in the contents of
   [`scripts/schema.sql`](./scripts/schema.sql), then run it once. This
   creates the `products` table.

## 4. Create photo storage (Cloudinary)

1. Sign up at **cloudinary.com** (free plan).
2. On your Dashboard's home page, you'll see **Cloud name**, **API Key**,
   and **API Secret** — copy all three.

## 5. Deploy the site (Render)

1. Sign up / log in at **render.com** — choose **"GitLab"** to connect
   your account (this is the same OAuth-style connection GitHub gave you
   trouble with, but on GitLab, which isn't flagged).
2. **New → Web Service**, pick the `n9btz-site` repository you pushed to
   GitLab.
3. Fill in:
   - **Name**: anything, e.g. `n9btz-site`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Before clicking **Create Web Service**, open **Advanced → Add
   Environment Variable** and add all six:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string from step 3 |
   | `CLOUDINARY_CLOUD_NAME` | from step 4 |
   | `CLOUDINARY_API_KEY` | from step 4 |
   | `CLOUDINARY_API_SECRET` | from step 4 |
   | `ADMIN_USERNAME` | any username you want to log in with |
   | `ADMIN_PASSWORD` | a strong password |
   | `SESSION_SECRET` | any long random string (32+ characters) |

5. Click **Create Web Service**. Render installs, builds, and starts the
   site — takes a minute or two the first time.

Your site is live at the `*.onrender.com` URL Render gives you. Add a
custom domain later under the service's **Settings → Custom Domains**.

**Free-tier note**: Render's free web services "sleep" after 15 minutes
with no visitors, so the very first visit after a quiet period takes
~30-50 seconds to wake up — after that it's fast again until it goes quiet
once more. The database (Neon) and photos (Cloudinary) are unaffected by
this and don't sleep or expire.

## 6. Using the admin panel

Visit `your-site.onrender.com/admin` (also linked from the site's nav bar
and footer). Sign in with the username/password from step 5:

- **Add a product**: category, Men/Women section, name, price, optional
  promo price, a photo (max 4 MB), and whether it's in stock.
- **Toggle stock**: click the "In stock" / "Out of stock" pill to flip it.
- **Promo price**: type a number and click **Set**; clear it and click
  **Set** to remove a promo (shows as a strikethrough original price with
  the promo price next to it, e.g. ~~200 DT~~ **50 DT**).
- **Delete**: removes the product and its photo for good.

## 7. Adding real photos to the site itself

The roster and schedule sections show placeholder tiles with the
streamers' names instead of photos (none were included in this handoff).
To add real ones:

1. Drop images into `public/photos/` (create the folder), e.g.
   `roster-left.jpg`.
2. In `public/index.html`, replace the `<span class="placeholder-tag">…</span>`
   inside `.roster-row-photo` / `.schedule-photo` with an `<img
   src="/photos/roster-left.jpg" alt="ZaNouNi">`.
3. Push the change to GitLab — Render redeploys automatically.

Product photos don't need this step — they're uploaded from the admin
panel straight to Cloudinary.

## 8. Local development

```bash
npm install
cp .env.example .env   # fill in the values from steps 3-5
npm start
```

Then open `http://localhost:3000`.

## 9. Project structure

```
server.js                 Express app: static files + API routes
public/
  index.html               Home page
  styles.css                 Design tokens (colors, fonts, layout)
  shop.html                   Shop category template (served at /shop/:category)
  admin/index.html              Admin panel
  admin/login/index.html          Sign-in form
  js/                                Client-side logic for the pages above
api/
  login.js / logout.js / session.js     Auth
  products.js                            List (public) / add (admin) products
  toggle-stock.js / set-promo.js / delete-product.js
  _lib/auth.js                            Session cookie signing/verification
  _lib/db.js                              Neon Postgres queries
  _lib/storage.js                         Cloudinary photo upload/delete
scripts/schema.sql          Run once in Neon to create the products table
```

Every page in `public/` is a real `.html` file — open any of them
directly and edit; no build step, no compiling. `styles.css` keeps every
color and font as a variable at the top (`:root { --bg: …; --accent: …; }`)
if you want to retheme anything.
