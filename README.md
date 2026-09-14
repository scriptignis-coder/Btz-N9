# THE N9 & BTZ — site (flat structure, for Render + GitHub/GitLab)

Same site as before (real `.html`/`.css` pages, Express server, password
admin panel, Neon database, Cloudinary photos) but restructured so **every
file sits directly in one folder — no subfolders at all.** This exists
because GitHub/GitLab's plain browser upload doesn't reliably preserve
nested folders, which is what broke the earlier version's deploy. Uploading
this version is just: select every file in this folder and drop them in —
there is nothing else to get wrong.

## 1. Upload these files to your repo

1. Open your repo on GitHub (`scriptignis-coder/Btz-N9`).
2. Delete the old files that are in there now (select them → Delete), or
   just upload over them — either way.
3. **Add file → Upload files**.
4. Open the `n9btz-flat` folder you unzipped, select **every file inside it**
   (Ctrl+A), and drag them all into the upload box. Since nothing is in a
   subfolder, there's no structure that can get lost.
5. Commit.
6. In Render, open your service → **Manual Deploy → Deploy latest commit**
   (or **Clear build cache & deploy** if it still fails).

## 2. Environment variables (Render → your service → Environment)

You already have these values from Neon and Cloudinary:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | your Neon connection string |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `ADMIN_USERNAME` | pick one |
| `ADMIN_PASSWORD` | pick one |
| `SESSION_SECRET` | any long random string |

Build Command: `npm install` — Start Command: `npm start`.

## 3. Using the site

- `your-site.onrender.com/` — public site
- `your-site.onrender.com/admin` — admin panel (login with the
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set)
- Add a product: category, Men/Women, name, price, optional promo price
  (shows as a strikethrough original price + the promo price, e.g.
  ~~200 DT~~ **50 DT**), a photo (max 4 MB), in-stock checkbox.
- Toggle stock, edit promo price, or delete any product any time.

## 4. Editing the site later

Every page is a plain `.html` file you can open and edit directly:

- `home.html` — the home page (roster, schedule, shop grid)
- `shop.html` — the shop category page template
- `admin.html` / `admin-login.html` — the admin panel and its login page
- `styles.css` — every color and font, as CSS variables at the very top

To add real roster/schedule photos: drop images anywhere convenient (e.g.
ask for a `photos/` folder to be added — since this build has no
subfolders, that would need `server.js` updated to serve it too), and
replace the `<span class="placeholder-tag">…</span>` blocks in `home.html`
with `<img>` tags.

`server.js` explicitly lists every page and asset it serves (`home.html`,
`shop.html`, `admin.html`, `admin-login.html`, `styles.css`, `shop.js`,
`admin.js`, `admin-login.js`) — this is also why `server.js`,
`package.json`, and the `.js` files behind `/api/...` are never directly
downloadable by a visitor, only the pages themselves.
