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

## 3. Real follower counts, hours, streak (manual)

Kick's own API doesn't expose follower count, peak viewers, hours-live or
streak for any channel at all — checked directly against their spec, it
just isn't there. So those numbers are meant to be typed in by hand and
kept up to date whenever you want, in `home.html`:

- Each streamer's `<div class="stat-row">` has 4 numbers: Followers, Peak
  viewers, Hours live (30d), Streak — just edit the number inside the
  matching `<div class="stat-value">…</div>`.
- The `<div class="combined-bar">` near the bottom of the Roster section
  has the 3 shared numbers (combined followers, joint streams, longest
  co-stream) the same way.

Edit, save, re-upload that one file to GitHub (or just edit it directly
in GitHub's web editor — pencil icon on the file) and Render redeploys
automatically.

## 4. Real "LIVE — n watching" badge (optional, automatic)

The one thing Kick's API *does* give for free is live/offline status and
the real live viewer count while a stream is live — the site shows this
as a small badge next to each streamer's name, automatically, once you
connect it:

1. On Kick: **Account Settings → Security** and turn on **2FA** (required
   before the Developer tab unlocks).
2. **Account Settings → Developer → Create an app**. It gives you a
   **Client ID** and **Client Secret** — copy both (the redirect URL
   field can be anything, e.g. `https://example.com`, since this site
   only uses the app for public data, not sign-in).
3. In Render → your service → Environment, add two more variables:

   | Key | Value |
   | --- | --- |
   | `KICK_CLIENT_ID` | from step 2 |
   | `KICK_CLIENT_SECRET` | from step 2 |

4. Redeploy. The badge next to ZaNouNi's and B_b10's names will start
   showing "Live — n watching" or "Offline" for real, refreshing every
   45 seconds — until then it just stays hidden, the rest of the site is
   unaffected.

## 5. Using the site

- `your-site.onrender.com/` — public site
- `your-site.onrender.com/admin` — admin panel (login with the
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set)
- Add a product: category, Men/Women, name, price, optional promo price
  (shows as a strikethrough original price + the promo price, e.g.
  ~~200 DT~~ **50 DT**), a photo (max 4 MB), in-stock checkbox.
- Toggle stock, edit promo price, or delete any product any time.

## 6. Editing the site later

Every page is a plain `.html` file you can open and edit directly:

- `home.html` — the home page (roster, schedule, shop grid, moments)
- `shop.html` — the shop category page template
- `admin.html` / `admin-login.html` — the admin panel and its login page
- `styles.css` — every color and font, as CSS variables at the very top

Roster/hero/schedule/moments photos are already in the site
(`hero-duo.jpg`, `roster-left.jpg`, `roster-right.jpg`, `moment-1.jpg`,
`moment-2.jpg`) — to swap any of them for a new photo, just upload a new
file with the exact same name (overwrite it on GitHub) and it updates
everywhere it's used.

`server.js` explicitly lists every page and asset it serves — this is
also why `server.js`, `package.json`, and the `.js` files behind
`/api/...` are never directly downloadable by a visitor, only the pages
themselves. If you ever add a brand-new file (not replacing an existing
one), it also needs adding to the `STATIC_FILES` list near the top of
`server.js` or Express won't serve it.
