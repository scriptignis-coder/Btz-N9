// Polls /api/kick-status (real data from Kick's API, server-side) and
// fills in the "LIVE — n watching" badge next to each streamer's name.
// Safe no-op if the badges aren't on the page, or if Kick isn't
// configured yet (KICK_CLIENT_ID/KICK_CLIENT_SECRET on the server).
(function () {
  var POLL_MS = 45000;

  function render(slug, info) {
    var el = document.querySelector('.live-status[data-slug="' + slug + '"]');
    if (!el || !info) return;
    if (info.unavailable) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (info.is_live) {
      el.textContent = 'Live — ' + Number(info.viewer_count || 0).toLocaleString() + ' watching';
      el.classList.add('is-live');
    } else {
      el.textContent = 'Offline';
      el.classList.remove('is-live');
    }
  }

  function poll() {
    fetch('/api/kick-status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        render('zanouni', data.zanouni);
        render('b_b10', data.b_b10);
      })
      .catch(function () {});
  }

  poll();
  setInterval(poll, POLL_MS);
})();
