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

## 3. Real "LIVE — n watching" badge + real follower counts (automatic)

Two different data sources power this, on purpose:

- **Live status + live viewer count** comes from Kick's **official**
  Developer API — stable, supported by Kick. Needs a free Kick developer
  app:

  1. On Kick: **Account Settings → Security** and turn on **2FA**
     (required before the Developer tab unlocks).
  2. **Account Settings → Developer → Create an app**. Fill in any name
     (letters/numbers only, no spaces or `&`), a real description (10+
     characters), and any redirect URL (e.g. `https://example.com` — it's
     never actually used, this app only reads public data). Under
     permissions, you only need **"Read channel info"** — you can uncheck
     the rest (streaming key, ads, moderation, chat). Creating it gives
     you a **Client ID** and **Client Secret**.
  3. In Render → your service → Environment, add:

     | Key | Value |
     | --- | --- |
     | `KICK_CLIENT_ID` | from step 2 |
     | `KICK_CLIENT_SECRET` | from step 2 |

- **Follower counts** are NOT available through Kick's official API at
  all — checked directly against their spec, it just isn't exposed. So
  this instead calls the same public endpoint kick.com's own website
  uses (`kick.com/api/v2/channels/{slug}`). This is **not an official,
  supported API** — Kick could change or block it at any time without
  notice — but it's the only way to get real follower numbers
  automatically. If it ever stops working, the follower numbers on the
  site just stay frozen at their last known value; nothing else breaks.

Redeploy after adding the env vars above. The badge next to ZaNouNi's and
B_b10's names, and the Followers numbers (including "Combined
followers"), will start updating for real, refreshing every 45 seconds —
until then they just stay as their placeholder numbers, the rest of the
site is unaffected.

**Peak viewers, Hours live (30d) and Streak** genuinely aren't available
anywhere (Kick doesn't track/expose that history at all) — those 6
numbers stay manually typed in `home.html`, in each streamer's
`<div class="stat-row">` — edit the number inside the matching
`<div class="stat-value">…</div>` whenever you want to update them, and
re-upload (or edit directly in GitHub's web editor — pencil icon on the
file).

## 4. Stream Stats page + Top Chatters (fully automatic, no login needed)

Nav → **Stream Stats** → pick ZaNouNi or B_b10 → opens `/stats/zanouni` or
`/stats/b_b10`, with:

- **Followers, Live status** — same automatic data as the home page.
- **Peak viewers / Hours live (30d) / Streak** — same manually-typed
  numbers as the roster cards (edit them in `stats.js` near the top,
  `STREAMERS.zanouni` / `STREAMERS.b_b10` — the same numbers as `home.html`'s
  stat-rows, kept in sync by hand).
- **Top Chatters** — a live top-10 list of who's chatting the most, reset
  automatically every time that streamer goes live. This needs **zero
  login or setup from ZaNouNi or B_b10** — no OAuth click, nothing. It
  works by listening to the exact same public real-time chat feed
  kick.com's own website uses to show chat to any visitor who isn't even
  logged in (`chat-listener.js`). Like the follower count, this is **not
  an official/documented Kick API** — Kick could change it without notice.
  If that happens, the Top Chatters list just stops updating (shows "Not
  tracking chat yet") — nothing else on the site is affected.
  One practical note: Render's free tier puts the site to sleep after 15
  minutes with no visitors, which drops the chat connection — it
  reconnects automatically as soon as the site wakes back up, but the
  chatter counts reset when that happens (same as a real "new live
  session" reset). On a paid Render plan (always-on) this wouldn't happen.

## 5. Game Play — Chkobba (needs one extra setup step)

Nav → the new **Game Play** section on the home page (before "Behind the
scenes") → **Play now** → `/game`. A visitor logs in with their own Kick
account, plays a hand of Chkobba (the Tunisian card game) against the
computer, and a win puts them on the "Top players" leaderboard under their
real Kick username.

This needs a real "Login with Kick" flow — genuinely different from
everything else on the site, since it's the first feature where a random
visitor authorizes the app with their own account (not you, not ZaNouNi/B_b10).
Kick's own official login system handles it; two things to set up once:

1. **On Kick**: go back into the same Developer App you already created for
   the live-status badge (Account Settings → Developer → your app → edit).
   - Turn on the **`user:read`** permission (it was off — you only needed
     "Read channel info" before).
   - Add a **Redirect URI**: `https://your-site.onrender.com/api/kick-oauth-callback`
     (use your actual Render URL — same domain as the site, just with that
     path at the end).
2. **In Render → your service → Environment**, add one more variable:

   | Key | Value |
   | --- | --- |
   | `SITE_URL` | `https://your-site.onrender.com` (your exact Render URL, no trailing slash) |

Redeploy after that. Nothing else needed — the leaderboard's database table
creates itself automatically the same way the gifters one does.

One honest caveat: like the follower badge and Top Chatters, this relies on
things staying exactly as Kick has them documented today — if Kick changes
their login system, "Login with Kick" would just stop working until it's
updated; nothing else on the site would be affected.

## 6. Using the site

- `your-site.onrender.com/` — public site
- `your-site.onrender.com/admin` — admin panel (login with the
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set)
- Add a product: category, Men/Women, name, price, optional promo price
  (shows as a strikethrough original price + the promo price, e.g.
  ~~200 DT~~ **50 DT**), a photo (max 4 MB), in-stock checkbox.
- Toggle stock, edit promo price, or delete any product any time.

## 7. Editing the site later

Every page is a plain `.html` file you can open and edit directly:

- `home.html` — the home page (roster, schedule, shop grid, moments)
- `shop.html` — the shop category page template
- `stats.html` — the Stream Stats page template (`stats.js` holds the
  per-streamer Peak viewers / Hours live / Streak numbers to hand-edit)
- `game.html` — the Chkobba game page (`chkobba.js` is the game engine,
  `game.js` wires it to the screen)
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
