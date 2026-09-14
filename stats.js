(function () {
  var STREAMERS = {
    zanouni: {
      name: 'ZaNouNi',
      photo: '/roster-right.jpg',
      bio: 'Variety gaming and late-night sessions — the calmer half of the duo, here for long chill streams and community chat.',
      kickUrl: 'https://kick.com/zanouni',
      kickLabel: 'kick.com/zanouni →',
      followersFallback: 18400,
      peakViewers: 2150,
      hoursLive: 96,
      streakDays: 12,
    },
    b_b10: {
      name: 'B_b10',
      photo: '/roster-left.jpg',
      bio: 'High-energy gameplay and clutch moments — brings the intensity, the collabs, and the Friday-night crowd.',
      kickUrl: 'https://kick.com/b_b10',
      kickLabel: 'kick.com/b_b10 →',
      followersFallback: 21900,
      peakViewers: 2760,
      hoursLive: 88,
      streakDays: 9,
    },
  };

  // Scale caps — how big a number needs to be to fill the bar 100%.
  // Set comfortably above realistic values so bars read as proportions,
  // not as "always maxed out".
  var CAPS = {
    followers: 150000,
    peakViewers: 5000,
    hoursLive: 150,
    streak: 30,
  };

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  function pct(value, cap) {
    var p = Math.round((value / cap) * 100);
    if (p < 4) p = 4; // keep a sliver visible even for small numbers
    if (p > 100) p = 100;
    return p;
  }

  function barRow(id, label, valueText, percent) {
    return (
      '<div class="stat-bar-row">' +
      '<div class="stat-bar-row-head"><span class="stat-bar-label">' + label + '</span>' +
      '<span class="stat-bar-value" id="' + id + '">' + valueText + '</span></div>' +
      '<div class="stat-bar-track"><div class="stat-bar-fill" id="' + id + '-fill" style="width:' + percent + '%"></div></div>' +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function chatterRow(rank, username, count, maxCount) {
    var pct = Math.max(6, Math.round((count / maxCount) * 100));
    return (
      '<div class="chatter-row">' +
      '<span class="chatter-rank">' + rank + '</span>' +
      '<div class="chatter-main">' +
      '<div class="chatter-row-head"><span class="chatter-name">' + escapeHtml(username) + '</span>' +
      '<span class="chatter-count">' + fmt(count) + '</span></div>' +
      '<div class="chatter-track"><div class="chatter-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '</div>'
    );
  }

  function pollTopChatters(slug) {
    fetch('/api/top-chatters?streamer=' + encodeURIComponent(slug))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var list = document.getElementById('chatters-list');
        var empty = document.getElementById('chatters-empty');
        var sub = document.getElementById('chatters-sub');
        var chatters = data.chatters || [];

        sub.textContent = data.is_live
          ? 'This live session — resets when a new stream starts'
          : 'Offline — showing the last tracked live session';

        if (!chatters.length) {
          list.innerHTML = '';
          list.hidden = true;
          empty.textContent = data.tracking
            ? 'No chat activity tracked yet for this session.'
            : 'Not tracking chat yet — check back shortly.';
          empty.hidden = false;
          return;
        }
        list.hidden = false;
        empty.hidden = true;
        var maxCount = chatters[0].count || 1;
        list.innerHTML = chatters
          .map(function (c, i) { return chatterRow(i + 1, c.username, c.count, maxCount); })
          .join('');
      })
      .catch(function () {});
  }

  function init() {
    var slug = window.location.pathname.split('/').filter(Boolean).pop();
    var s = STREAMERS[slug];

    if (!s) {
      document.getElementById('stats-name').textContent = 'Streamer not found';
      document.getElementById('stat-bars-list').innerHTML = '';
      return;
    }

    document.title = s.name + ' — Stream Stats — THE N9 & BTZ';
    document.getElementById('stats-name').textContent = s.name;
    document.getElementById('stats-bio').textContent = s.bio;

    var photo = document.getElementById('stats-photo');
    photo.src = s.photo;
    photo.alt = s.name;

    var kickLink = document.getElementById('stats-kick-link');
    kickLink.href = s.kickUrl;
    kickLink.textContent = s.kickLabel;

    var liveEl = document.getElementById('stats-live');
    liveEl.setAttribute('data-slug', slug);

    var list = document.getElementById('stat-bars-list');
    list.innerHTML =
      barRow('bar-followers', 'Followers', fmt(s.followersFallback), pct(s.followersFallback, CAPS.followers)) +
      barRow('bar-peak', 'Peak viewers', fmt(s.peakViewers), pct(s.peakViewers, CAPS.peakViewers)) +
      barRow('bar-hours', 'Hours live (30d)', fmt(s.hoursLive), pct(s.hoursLive, CAPS.hoursLive)) +
      barRow('bar-streak', 'Streak', s.streakDays + 'd', pct(s.streakDays, CAPS.streak));

    fetch('/api/kick-status')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var info = data[slug];
        if (!info) return;

        if (!info.live_unavailable) {
          liveEl.hidden = false;
          if (info.is_live) {
            liveEl.textContent = 'Live — ' + fmt(info.viewer_count || 0) + ' watching';
            liveEl.classList.add('is-live');
          } else {
            liveEl.textContent = 'Offline';
            liveEl.classList.remove('is-live');
          }
        }

        if (info.followers != null) {
          var valueEl = document.getElementById('bar-followers');
          var fillEl = document.getElementById('bar-followers-fill');
          if (valueEl) valueEl.textContent = fmt(info.followers);
          if (fillEl) fillEl.style.width = pct(info.followers, CAPS.followers) + '%';
        }
      })
      .catch(function () {});

    pollTopChatters(slug);
    setInterval(function () { pollTopChatters(slug); }, 20000);
  }

  init();
})();
