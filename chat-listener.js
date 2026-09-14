// "Top Chatters" — fully automatic, no login from ZaNouNi/B_b10 needed.
//
// Kick's OFFICIAL chat webhook (chat.message.sent) requires each streamer to
// individually authorize the app (a real one-time OAuth click on their end)
// — that was the blocker discussed and dropped earlier.
//
// This instead listens to the SAME public, anonymous, real-time chat feed
// kick.com's own website uses to show chat to any visitor who isn't logged
// in: a public Pusher WebSocket channel. No token, no per-streamer login —
// just the streamer's public chatroom id (from the same unofficial
// kick.com/api/v2/channels/{slug} endpoint already used for followers).
//
// This is NOT an official/documented Kick API. Kick could change the
// WebSocket URL, app key, channel naming or event names at any time without
// notice — if that happens, this module just stops updating (logs and
// retries), the rest of the site is completely unaffected.

const WebSocket = require('ws');
const db = require('./db');

const SLUGS = ['zanouni', 'b_b10'];
const PUSHER_KEY = '32cbd69e4b950bf97679';
const PUSHER_URL =
  'wss://ws-us2.pusher.com/app/' + PUSHER_KEY + '?protocol=7&client=js&version=7.6.0&flash=false';
const CHANNEL_CHECK_MS = 30_000; // how often we check live/offline (to know when to reset the board)
const RECONNECT_MS = 8_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const state = {};
for (const slug of SLUGS) {
  state[slug] = {
    chatroomId: null,
    ws: null,
    counts: new Map(),
    isLive: false,
    connected: false,
  };
}

async function fetchChannel(slug) {
  const res = await fetch('https://kick.com/api/v2/channels/' + slug, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('channel_lookup_failed');
  return res.json();
}

function bump(slug, username) {
  if (!username) return;
  const s = state[slug];
  s.counts.set(username, (s.counts.get(username) || 0) + 1);
}

// Kick's gift-sub event isn't as battle-tested/documented as chat messages
// across the reverse-engineered clients that exist for it — field naming
// varies (snake_case on the wire, some libs re-case it) — so this reads
// defensively across the variants seen in the wild instead of trusting one.
function handleGift(slug, payload) {
  if (!payload) return;
  const gifter =
    payload.gifter_username || payload.gifterUsername || (payload.gifter && payload.gifter.username) || null;
  if (!gifter) return;

  let quantity = null;
  if (Array.isArray(payload.gifted_usernames)) quantity = payload.gifted_usernames.length;
  else if (Array.isArray(payload.giftedUsernames)) quantity = payload.giftedUsernames.length;
  else if (Number.isFinite(payload.quantity)) quantity = payload.quantity;
  else if (Number.isFinite(payload.giftedCount)) quantity = payload.giftedCount;
  if (!quantity || quantity <= 0) quantity = 1; // at least log that a gift happened

  db.recordGift({ streamer: slug, gifterUsername: gifter, quantity }).catch(() => {
    // DB not reachable this round — this one gift just isn't counted, nothing else breaks
  });
}

function connectChat(slug) {
  const s = state[slug];
  if (!s.chatroomId) return;
  if (s.ws) {
    try { s.ws.terminate(); } catch (_) { /* noop */ }
  }

  let ws;
  try {
    ws = new WebSocket(PUSHER_URL);
  } catch (_) {
    setTimeout(() => connectChat(slug), RECONNECT_MS);
    return;
  }
  s.ws = ws;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (_) { return; }

    if (msg.event === 'pusher:connection_established') {
      s.connected = true;
      ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: 'chatrooms.' + s.chatroomId + '.v2' } }));
      return;
    }

    if (msg.event === 'App\\Events\\ChatMessageEvent' || msg.event === 'App\\Events\\ChatMessageSentEvent') {
      let payload;
      try { payload = JSON.parse(msg.data); } catch (_) { return; }
      const username = payload && payload.sender && payload.sender.username;
      bump(slug, username);
      return;
    }

    if (
      msg.event === 'App\\Events\\GiftedSubscriptionsEvent' ||
      msg.event === 'App\\Events\\GiftsLeaderboardUpdated' ||
      msg.event === 'App\\Events\\SubscriptionEvent'
    ) {
      let payload;
      try { payload = JSON.parse(msg.data); } catch (_) { return; }
      console.log('[chat-listener]', slug, msg.event, JSON.stringify(payload).slice(0, 500));
      handleGift(slug, payload);
      return;
    }

    // Anything else we don't recognize yet — log it (truncated) so a real
    // gift/sub moment caught here in production tells us the exact event
    // name and field shape Kick actually uses, instead of guessing blind.
    if (msg.event && msg.event.indexOf('pusher:') !== 0) {
      console.log('[chat-listener]', slug, 'unhandled event:', msg.event, String(msg.data).slice(0, 300));
    }
  });

  ws.on('close', () => {
    s.connected = false;
    setTimeout(() => connectChat(slug), RECONNECT_MS);
  });

  ws.on('error', () => {
    s.connected = false;
    try { ws.terminate(); } catch (_) { /* noop */ }
  });
}

async function checkLive(slug) {
  const s = state[slug];
  try {
    const json = await fetchChannel(slug);
    const chatroomId = json && json.chatroom && json.chatroom.id;
    const isLive = !!(json && json.livestream);

    if (chatroomId && chatroomId !== s.chatroomId) {
      s.chatroomId = chatroomId;
      connectChat(slug); // first time we learn the chatroom id — connect
    }

    if (isLive && !s.isLive) {
      s.counts = new Map(); // went live — fresh leaderboard for this session
    }
    s.isLive = isLive;

    if (s.chatroomId && (!s.ws || (s.ws.readyState !== WebSocket.OPEN && s.ws.readyState !== WebSocket.CONNECTING))) {
      connectChat(slug); // make sure we're actually connected
    }
  } catch (_) {
    // Kick blocked/changed the endpoint this round — just try again next tick
  }
}

function topChatters(slug, limit) {
  const s = state[slug];
  if (!s) return [];
  return Array.from(s.counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 10)
    .map(([username, count]) => ({ username, count }));
}

function getStatus(slug) {
  const s = state[slug];
  if (!s) return null;
  return { is_live: s.isLive, tracking: s.connected };
}

function init() {
  for (const slug of SLUGS) {
    checkLive(slug);
    setInterval(() => checkLive(slug), CHANNEL_CHECK_MS);
  }
}

module.exports = { init, topChatters, getStatus, SLUGS };
