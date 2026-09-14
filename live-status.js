// Polls /api/kick-status (real data from Kick, fetched server-side) and:
//  1. fills in the "LIVE — n watching" badge next to each streamer's name
//  2. fills in the real Followers number, for each streamer and the
//     combined total, wherever a [data-stat] hook is on the page
// Safe no-op wherever a hook isn't on the page, and never overwrites a
// number with a missing/unavailable one — it just leaves the page as-is.
(function () {
  var POLL_MS = 45000;

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  function renderLive(slug, info) {
    var el = document.querySelector('.live-status[data-slug="' + slug + '"]');
    if (!el || !info) return;
    if (info.live_unavailable) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (info.is_live) {
      el.textContent = 'Live — ' + fmt(info.viewer_count || 0) + ' watching';
      el.classList.add('is-live');
    } else {
      el.textContent = 'Offline';
      el.classList.remove('is-live');
    }
  }

  function renderFollowers(slug, info) {
    if (!info || info.followers == null) return; // unavailable this round — leave the page's number alone
    var el = document.querySelector('[data-stat="followers-' + slug + '"]');
    if (el) el.textContent = fmt(info.followers);
  }

  function renderCombined(data) {
    var a = data.zanouni && data.zanouni.followers;
    var b = data.b_b10 && data.b_b10.followers;
    if (a == null || b == null) return;
    var el = document.querySelector('[data-stat="followers-combined"]');
    if (el) el.textContent = fmt(a + b);
  }

  function poll() {
    fetch('/api/kick-status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderLive('zanouni', data.zanouni);
        renderLive('b_b10', data.b_b10);
        renderFollowers('zanouni', data.zanouni);
        renderFollowers('b_b10', data.b_b10);
        renderCombined(data);
      })
      .catch(function () {});
  }

  poll();
  setInterval(poll, POLL_MS);
})();
