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
  var gameOver = false;
  var currentPlayer = null;

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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
      ? 'round over'
      : turn === 'player'
      ? 'your turn'
      : 'computer thinking…';
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
        if (who === 'player') playerScopas++;
        else aiScopas++;
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

  function endRound() {
    if (table.length && lastCapturer) {
      if (lastCapturer === 'player') playerCaptured = playerCaptured.concat(table);
      else aiCaptured = aiCaptured.concat(table);
      table = [];
    }
    var result = Chkobba.scoreRound(playerCaptured, aiCaptured, playerScopas, aiScopas);
    gameOver = true;
    render();
    showResult(result);
    if (result.playerTotal > result.aiTotal) reportWin();
  }

  function breakdownLine(label, playerPts, aiPts) {
    return (
      '<div class="result-row"><span>' + label + '</span>' +
      '<span>' + (playerPts || 0) + ' — ' + (aiPts || 0) + '</span></div>'
    );
  }

  function showResult(result) {
    var title = document.getElementById('result-title');
    if (result.playerTotal > result.aiTotal) title.textContent = 'You win! 🎉';
    else if (result.aiTotal > result.playerTotal) title.textContent = 'Computer wins';
    else title.textContent = "It's a draw";

    var b = result.breakdown;
    document.getElementById('result-breakdown').innerHTML =
      breakdownLine('Most cards', b.player.cards, b.ai.cards) +
      breakdownLine('Most coins', b.player.coins, b.ai.coins) +
      breakdownLine('Sette bello', b.player.setteBello, b.ai.setteBello) +
      breakdownLine('Primiera', b.player.primiera, b.ai.primiera) +
      breakdownLine('Scopas', b.player.scopas, b.ai.scopas) +
      '<div class="result-row result-total"><span>Total</span><span>' +
      result.playerTotal + ' — ' + result.aiTotal + '</span></div>';

    document.getElementById('result-overlay').hidden = false;
  }

  function reportWin() {
    fetch('/api/chkobba-report-win', { method: 'POST' })
      .then(function () { loadLeaderboard(); })
      .catch(function () {});
  }

  function startNewRound() {
    deck = Chkobba.shuffle(Chkobba.buildDeck());
    table = deck.splice(0, 4);
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
        startNewRound();

        document.getElementById('new-round-btn').addEventListener('click', startNewRound);
        document.getElementById('play-again-btn').addEventListener('click', startNewRound);
      })
      .catch(function () {
        document.getElementById('login-gate').hidden = false;
      });
  }

  init();
})();
