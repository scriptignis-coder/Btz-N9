(function () {
  var deck = [];
  var table = [];
  var playerHand = [];
  var aiHand = [];
  var playerCaptured = [];
  var aiCaptured = [];
  var playerScopas = 0;
  var aiScopas = 0;
  var lastCapturer = null;
  var turn = 'player';
  var gameOver = false; // true once the current HAND has no more moves left
  var currentPlayer = null;

  // Real Chkobba (chkobbeta.tn's system, same as it's actually played) isn't
  // decided by one hand — hands keep getting dealt and scored until someone's
  // running total reaches Chkobba.MATCH_TARGET (21). matchScore accumulates
  // across hands; only once the MATCH is decided do we report a win and show
  // the final "you win" screen.
  var matchScore = { player: 0, ai: 0 };
  var pendingNextHand = false; // true while the overlay on screen is a "hand won" notice, not the final match result
  var autoAdvanceTimer = null;

  // Real Chkobba has a "dealer can't score a chkobba with the very last
  // card of the hand" rule. There's no rotating deal in a vs-computer game,
  // so the computer is simply the permanent dealer for this purpose.
  var AI_IS_DEALER = true;

  var musicEl = null;
  var musicStarted = false;

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Browsers block audio-with-sound until a real user gesture happens on the
  // page. We call this from every button click in the game (New match, Next
  // hand, Play again) and from the first click anywhere on the page, so the
  // music reliably kicks in as soon as the person actually starts playing —
  // even though the very first automatic call (right after the Kick login
  // redirect, with no click yet) will likely get silently blocked.
  function tryPlayMusic() {
    if (!musicEl || musicStarted || musicEl.muted) return;
    var p = musicEl.play();
    if (p && typeof p.catch === 'function') {
      p.then(function () { musicStarted = true; }).catch(function () {
        // Blocked by autoplay policy — fine, it'll try again on the next click.
      });
    } else {
      musicStarted = true;
    }
  }

  function cardEl(card, clickable) {
    var div = document.createElement('div');
    div.className = 'card' + (Chkobba.RED_SUITS[card.suit] ? ' red' : '');
    div.innerHTML =
      '<span class="card-corner">' + Chkobba.RANK_LABELS[card.rank] + '</span>' +
      '<span class="card-suit">' + Chkobba.SUIT_SYMBOLS[card.suit] + '</span>';
    if (clickable) {
      div.classList.add('is-clickable');
      div.addEventListener('click', function () { onPlayerCardClick(card); });
    }
    return div;
  }

  function cardBackEl() {
    var div = document.createElement('div');
    div.className = 'card card-back';
    return div;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function render() {
    var playerHandEl = document.getElementById('player-hand');
    var aiHandEl = document.getElementById('ai-hand');
    var tableEl = document.getElementById('table-cards');

    clear(playerHandEl);
    playerHand.forEach(function (c) {
      playerHandEl.appendChild(cardEl(c, turn === 'player' && !gameOver));
    });

    clear(aiHandEl);
    aiHand.forEach(function () { aiHandEl.appendChild(cardBackEl()); });

    clear(tableEl);
    if (!table.length) {
      var empty = document.createElement('span');
      empty.className = 'chkobba-table-empty';
      empty.textContent = 'Table is empty';
      tableEl.appendChild(empty);
    } else {
      table.forEach(function (c) { tableEl.appendChild(cardEl(c, false)); });
    }

    document.getElementById('ai-captured-count').textContent = fmt(aiCaptured.length);
    document.getElementById('player-captured-count').textContent = fmt(playerCaptured.length);
    document.getElementById('ai-scopa-count').textContent = fmt(aiScopas);
    document.getElementById('player-scopa-count').textContent = fmt(playerScopas);
    document.getElementById('deck-count').textContent = fmt(deck.length);
    document.getElementById('turn-indicator').textContent = gameOver
      ? 'hand over'
      : turn === 'player'
      ? 'your turn'
      : 'computer thinking…';

    var scoreTag = document.getElementById('match-score-tag');
    if (scoreTag) {
      scoreTag.textContent = 'Match: You ' + matchScore.player + ' — ' + matchScore.ai + ' Computer (first to ' + Chkobba.MATCH_TARGET + ')';
    }
  }

  function dealBatch() {
    if (!deck.length) return false;
    playerHand = deck.splice(0, 3);
    aiHand = deck.splice(0, 3);
    return true;
  }

  function playCard(who, card, forcedCapture) {
    var hand = who === 'player' ? playerHand : aiHand;
    var idx = -1;
    for (var i = 0; i < hand.length; i++) {
      if (hand[i].id === card.id) { idx = i; break; }
    }
    if (idx === -1) return;
    hand.splice(idx, 1);

    var capture = forcedCapture;
    if (capture === undefined) {
      var options = Chkobba.captureOptions(card, table);
      capture = options.length ? Chkobba.bestOption(options, table.length) : [];
    }

    if (capture && capture.length) {
      var wasFullTable = capture.length === table.length;
      table = Chkobba.removeCards(table, capture);
      var captured = capture.concat([card]);
      if (who === 'player') playerCaptured = playerCaptured.concat(captured);
      else aiCaptured = aiCaptured.concat(captured);
      lastCapturer = who;
      if (wasFullTable && table.length === 0) {
        // The dealer doesn't get a chkobba for the very last card of the
        // hand — real rule, stops a guaranteed free point from just
        // however the deal happened to land.
        var isLastCardOfHand = !deck.length && !playerHand.length && !aiHand.length;
        var dealerBlocked = isLastCardOfHand && who === 'ai' && AI_IS_DEALER;
        if (!dealerBlocked) {
          if (who === 'player') playerScopas++;
          else aiScopas++;
        }
      }
    } else {
      table.push(card);
    }
  }

  function onPlayerCardClick(card) {
    if (turn !== 'player' || gameOver) return;
    playCard('player', card);
    turn = 'ai';
    render();
    setTimeout(doAiTurn, 750);
  }

  function doAiTurn() {
    if (gameOver) return;
    var move = Chkobba.aiChooseMove(aiHand, table);
    playCard('ai', move.card, move.capture);

    if (!playerHand.length && !aiHand.length) {
      if (deck.length) {
        dealBatch();
        turn = 'player';
      } else {
        endRound();
        return;
      }
    } else {
      turn = 'player';
    }
    render();
  }

  // A HAND just ended (deck exhausted, both hands empty). Score it, fold it
  // into the running match total, and either the match is decided (someone
  // reached Chkobba.MATCH_TARGET and isn't tied) or it isn't — in which case
  // another hand gets dealt automatically, same as real Chkobba.
  function endRound() {
    if (table.length && lastCapturer) {
      if (lastCapturer === 'player') playerCaptured = playerCaptured.concat(table);
      else aiCaptured = aiCaptured.concat(table);
      table = [];
    }
    var result = Chkobba.scoreRound(playerCaptured, aiCaptured, playerScopas, aiScopas);
    gameOver = true;
    render();

    matchScore.player += result.playerTotal;
    matchScore.ai += result.aiTotal;

    var target = Chkobba.MATCH_TARGET;
    var reachedTarget = matchScore.player >= target || matchScore.ai >= target;
    var tied = matchScore.player === matchScore.ai;
    var decided = reachedTarget && !tied;

    if (decided) {
      pendingNextHand = false;
      showResult(result, true);
      if (matchScore.player > matchScore.ai) reportWin();
    } else {
      pendingNextHand = true;
      showResult(result, false);
    }
  }

  function breakdownLine(label, playerPts, aiPts) {
    return (
      '<div class="result-row"><span>' + label + '</span>' +
      '<span>' + (playerPts || 0) + ' — ' + (aiPts || 0) + '</span></div>'
    );
  }

  function showResult(result, isFinal) {
    var title = document.getElementById('result-title');
    var subtitle = document.getElementById('result-subtitle');
    var btn = document.getElementById('play-again-btn');

    if (isFinal) {
      if (matchScore.player > matchScore.ai) title.textContent = 'You win the match! 🎉';
      else title.textContent = 'Computer wins the match';
      if (subtitle) {
        subtitle.textContent = 'Final score — You ' + matchScore.player + ' · Computer ' + matchScore.ai;
      }
      if (btn) btn.textContent = 'Play again';
    } else {
      if (result.playerTotal > result.aiTotal) title.textContent = 'You win this hand';
      else if (result.aiTotal > result.playerTotal) title.textContent = 'Computer wins this hand';
      else title.textContent = 'This hand is tied';
      if (subtitle) {
        subtitle.textContent =
          'Match score — You ' + matchScore.player + ' · Computer ' + matchScore.ai +
          ' (first to ' + Chkobba.MATCH_TARGET + ' wins the match)';
      }
      if (btn) btn.textContent = 'Next hand →';
    }

    var b = result.breakdown;
    document.getElementById('result-breakdown').innerHTML =
      breakdownLine('Karta — most cards', b.player.cards, b.ai.cards) +
      breakdownLine('Dineri — most diamonds', b.player.coins, b.ai.coins) +
      breakdownLine('Bermila — most 7s', b.player.bermila, b.ai.bermila) +
      breakdownLine('7ayya — 7 of diamonds', b.player.hayya, b.ai.hayya) +
      breakdownLine('Chkobba', b.player.scopas, b.ai.scopas) +
      '<div class="result-row result-total"><span>Hand total</span><span>' +
      result.playerTotal + ' — ' + result.aiTotal + '</span></div>';

    document.getElementById('result-overlay').hidden = false;

    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    if (!isFinal) {
      // Between-hand notice auto-advances on its own after a few seconds —
      // clicking "Next hand" early just gets there sooner.
      autoAdvanceTimer = setTimeout(function () {
        autoAdvanceTimer = null;
        if (pendingNextHand) startHand();
      }, 3200);
    }
  }

  function reportWin() {
    fetch('/api/chkobba-report-win', { method: 'POST' })
      .then(function () { loadLeaderboard(); })
      .catch(function () {});
  }

  // Shuffles and cuts a fresh deck + opening table, redealing if the 4
  // table cards land void (3 or 4 of them share the same rank — the real
  // rule, so a first-move sweep can't just happen by chance).
  function dealOpeningTable() {
    var freshDeck, freshTable;
    var attempts = 0;
    do {
      freshDeck = Chkobba.shuffle(Chkobba.buildDeck());
      freshTable = freshDeck.splice(0, 4);
      attempts++;
    } while (Chkobba.isVoidTableDeal(freshTable) && attempts < 25);
    return { deck: freshDeck, table: freshTable };
  }

  // Deals a fresh HAND (does not touch matchScore).
  function startHand() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    var dealt = dealOpeningTable();
    deck = dealt.deck;
    table = dealt.table;
    playerCaptured = [];
    aiCaptured = [];
    playerScopas = 0;
    aiScopas = 0;
    lastCapturer = null;
    gameOver = false;
    turn = 'player';
    dealBatch();
    document.getElementById('result-overlay').hidden = true;
    render();
  }

  // Starts a brand-new MATCH — resets the cumulative score back to 0-0.
  function startNewMatch() {
    matchScore = { player: 0, ai: 0 };
    pendingNextHand = false;
    startHand();
    tryPlayMusic();
  }

  function onPlayAgainClick() {
    tryPlayMusic();
    if (pendingNextHand) startHand();
    else startNewMatch();
  }

  function onNewMatchClick() {
    tryPlayMusic();
    startNewMatch();
  }

  function leaderboardRow(rank, username, wins, maxWins) {
    var pct = Math.max(6, Math.round((wins / maxWins) * 100));
    return (
      '<div class="chatter-row">' +
      '<span class="chatter-rank">' + rank + '</span>' +
      '<div class="chatter-main">' +
      '<div class="chatter-row-head"><span class="chatter-name">' + escapeHtml(username) + '</span>' +
      '<span class="chatter-count">' + fmt(wins) + ' wins</span></div>' +
      '<div class="chatter-track"><div class="chatter-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '</div>'
    );
  }

  function loadLeaderboard() {
    fetch('/api/chkobba-leaderboard')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var list = document.getElementById('leaderboard-list');
        var empty = document.getElementById('leaderboard-empty');
        var rows = data.leaderboard || [];

        if (!data.available) {
          list.hidden = true;
          empty.textContent = 'Not available yet — check back shortly.';
          empty.hidden = false;
          return;
        }
        if (!rows.length) {
          list.hidden = true;
          empty.textContent = 'No wins recorded yet — be the first!';
          empty.hidden = false;
          return;
        }
        list.hidden = false;
        empty.hidden = true;
        var maxWins = rows[0].wins || 1;
        list.innerHTML = rows
          .map(function (r, i) { return leaderboardRow(i + 1, r.username, r.wins, maxWins); })
          .join('');
      })
      .catch(function () {});
  }

  function init() {
    var params = new URLSearchParams(window.location.search);

    musicEl = document.getElementById('game-music');
    var musicToggle = document.getElementById('music-toggle');
    if (musicToggle) {
      musicToggle.addEventListener('click', function () {
        if (!musicEl) return;
        musicEl.muted = !musicEl.muted;
        musicToggle.textContent = musicEl.muted ? '🔇' : '🔊';
        musicToggle.setAttribute('aria-label', musicEl.muted ? 'Unmute music' : 'Mute music');
        if (!musicEl.muted) tryPlayMusic();
      });
    }
    // In case the very first automatic play attempt (right after the Kick
    // login redirect) got blocked, the next tap anywhere on the page nudges it.
    document.addEventListener('click', tryPlayMusic, { once: true });

    fetch('/api/player-session')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        loadLeaderboard();

        if (!data.player) {
          if (params.get('login') === 'failed') {
            document.getElementById('login-gate-msg').textContent =
              "Kick login didn't go through — try again.";
          }
          document.getElementById('login-gate').hidden = false;
          return;
        }

        currentPlayer = data.player;
        document.getElementById('player-name').textContent = currentPlayer.username;
        document.getElementById('game-area').hidden = false;
        startNewMatch();

        document.getElementById('new-round-btn').addEventListener('click', onNewMatchClick);
        document.getElementById('play-again-btn').addEventListener('click', onPlayAgainClick);
      })
      .catch(function () {
        document.getElementById('login-gate').hidden = false;
      });
  }

  init();
})();
