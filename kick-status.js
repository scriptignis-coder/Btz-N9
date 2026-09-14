// Two different data sources, on purpose:
//
// 1. Live status + live viewer count — Kick's OFFICIAL Developer API
//    (docs.kick.com). Needs a free Kick developer app — see README — via
//    KICK_CLIENT_ID / KICK_CLIENT_SECRET. Stable, supported by Kick.
//
// 2. Follower count — Kick's official API does NOT expose this at all
//    (checked against their full API spec — it just isn't there), so
//    this calls the same public JSON endpoint kick.com's own site uses
//    (kick.com/api/v2/channels/{slug}). This is NOT an official/supported
//    API — Kick could change or block it at any time without notice —
//    but it's the only way to get real follower counts automatically.
//
// Either source failing independently never breaks the other, and never
// breaks the site — the frontend just leaves that one number alone.

const SLUGS = ['zanouni', 'b_b10'];
const LIVE_CACHE_MS = 30_000; // official API — fine to check often
const FOLLOWERS_CACHE_MS = 5 * 60_000; // unofficial endpoint — ask less often, be a good citizen

let tokenCache = { token: null, expiresAt: 0 };
let liveCache = { data: null, fetchedAt: 0 };
let followersCache = { data: null, fetchedAt: 0 };

async function getAppToken() {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 30_000) {
    return tokenCache.token;
  }
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('kick_not_configured');
  }
  const res = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error('kick_token_failed');
  const json = await res.json();
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return tokenCache.token;
}

async function fetchLive() {
  const now = Date.now();
  if (liveCache.data && now - liveCache.fetchedAt < LIVE_CACHE_MS) {
    return liveCache.data;
  }
  const token = await getAppToken();
  const params = new URLSearchParams();
  SLUGS.forEach((s) => params.append('slug', s));
  const res = await fetch('https://api.kick.com/public/v1/channels?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('kick_channels_failed');
  const json = await res.json();
  const channels = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

  const out = {};
  for (const slug of SLUGS) {
    const ch = channels.find((c) => c.slug === slug);
    out[slug] = ch && ch.stream
      ? {
          is_live: !!ch.stream.is_live,
          viewer_count: ch.stream.viewer_count || 0,
          stream_title: ch.stream_title || '',
        }
      : { is_live: false, viewer_count: 0, stream_title: '' };
  }
  liveCache = { data: out, fetchedAt: now };
  return out;
}

async function fetchFollowers() {
  const now = Date.now();
  if (followersCache.data && now - followersCache.fetchedAt < FOLLOWERS_CACHE_MS) {
    return followersCache.data;
  }
  const out = {};
  await Promise.all(
    SLUGS.map(async (slug) => {
      try {
        const res = await fetch('https://kick.com/api/v2/channels/' + slug, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'application/json',
          },
        });
        if (!res.ok) throw new Error('bad_status');
        const json = await res.json();
        const count = Number(json.followers_count);
        out[slug] = Number.isFinite(count) ? count : null;
      } catch (err) {
        out[slug] = null; // Kick blocked/changed it this round — frontend just keeps the old number
      }
    })
  );
  followersCache = { data: out, fetchedAt: now };
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const [live, followers] = await Promise.all([
    fetchLive().catch(() => null),
    fetchFollowers().catch(() => null),
  ]);

  const out = {};
  for (const slug of SLUGS) {
    const l = live && live[slug];
    out[slug] = {
      is_live: l ? l.is_live : false,
      viewer_count: l ? l.viewer_count : 0,
      stream_title: l ? l.stream_title : '',
      live_unavailable: !l,
      followers: followers ? followers[slug] : null,
    };
  }
  res.status(200).json(out);
};
