// Live status + live viewer count, pulled from Kick's official Developer
// API (docs.kick.com). Needs a free Kick developer app — see README for
// setup — via the KICK_CLIENT_ID / KICK_CLIENT_SECRET env vars.
//
// Important: Kick's API does NOT expose follower count, peak viewers,
// hours-live or streak for any channel (checked against their full API
// spec) — only live/offline + the current viewer count while live. Those
// other numbers stay manually edited in home.html; this only powers the
// small "LIVE — n watching" badge next to each streamer's name.

const SLUGS = ['zanouni', 'b_b10'];
const CACHE_MS = 30_000; // don't call Kick's API on every single visitor

let tokenCache = { token: null, expiresAt: 0 };
let dataCache = { data: null, fetchedAt: 0 };

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

async function fetchStatus() {
  const now = Date.now();
  if (dataCache.data && now - dataCache.fetchedAt < CACHE_MS) {
    return dataCache.data;
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
  dataCache = { data: out, fetchedAt: now };
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const data = await fetchStatus();
    res.status(200).json(data);
  } catch (err) {
    // Not configured yet, or Kick's API is unreachable — tell the frontend
    // to just hide the badges rather than showing wrong data.
    res.status(200).json({
      zanouni: { is_live: false, viewer_count: 0, unavailable: true },
      b_b10: { is_live: false, viewer_count: 0, unavailable: true },
    });
  }
};
