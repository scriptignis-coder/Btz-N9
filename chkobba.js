// Chkobba (the Tunisian card game, aka Scopa) — a complete engine (you vs
// the computer), pure logic, no DOM. 40 cards, 4 suits, ranks 1-10 — shown
// and called entirely by number, the way it's actually played in Tunisia
// (no J/Q/K letters). Diamonds is the "coins" suit used for the
// coins-count and sette-bello ("bermila") scoring categories. Matches the
// same system as chkobbeta.tn/game: deal 3 to each player + 4 to the
// table, played anticlockwise, four scoring categories (karta/dineri/
// bermila/7ayya = cards/coins/sette-bello/primiera) plus one point per
// chkobba, first to 21 cumulative points across as many hands as it takes
// wins the match.
window.Chkobba = (function () {
  var SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  var COINS_SUIT = 'diamonds';
  var SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  var RED_SUITS = { hearts: true, diamonds: true };
  // Tunisian Chkobba is played and called entirely by number — no J/Q/K.
  var RANK_LABELS = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' };
  // Classic "primiera" ranking — 7 is worth the most, then 6, then 5... face cards worth the least.
  var PRIMIERA_VALUE = { 7: 21, 6: 18, 5: 15, 4: 14, 3: 13, 2: 12, 1: 11, 8: 10, 9: 10, 10: 10 };

  function buildDeck() {
    var deck = [];
    for (var s = 0; s < SUITS.length; s++) {
      for (var r = 1; r <= 10; r++) {
        deck.push({ suit: SUITS[s], rank: r, id: SUITS[s] + '-' + r });
      }
    }
    return deck;
  }

  function shuffle(deck) {
    var out = deck.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function label(card) {
    return RANK_LABELS[card.rank] + SUIT_SYMBOLS[card.suit];
  }

  function cardSum(cards) {
    return cards.reduce(function (sum, c) { return sum + c.rank; }, 0);
  }

  // Every subset of `arr` (as an array of index-arrays), excluding the empty set.
  // Table sizes in Chkobba realistically stay small (<=10ish), so brute force is fine.
  function allSubsets(arr) {
    var out = [];
    var n = arr.length;
    for (var mask = 1; mask < 1 << n; mask++) {
      var subset = [];
      for (var i = 0; i < n; i++) {
        if (mask & (1 << i)) subset.push(arr[i]);
      }
      out.push(subset);
    }
    return out;
  }

  // Returns an array of capture options — each option is an array of table
  // cards that `card` can legally capture. Same-rank single-card matches
  // always take priority over sum-combinations (the standard rule).
  function captureOptions(card, table) {
    var singles = table.filter(function (t) { return t.rank === card.rank; }).map(function (t) { return [t]; });
    if (singles.length) return singles;

    var sums = allSubsets(table).filter(function (subset) { return cardSum(subset) === card.rank; });
    return sums;
  }

  function removeCards(table, toRemove) {
    var ids = toRemove.map(function (c) { return c.id; });
    return table.filter(function (c) { return ids.indexOf(c.id) === -1; });
  }

  // Picks the best capture option for a hypothetical play of `card` — prefers
  // a scopa (clears the table), then the option with the most cards, then the
  // option worth the most toward coins/primiera.
  function bestOption(options, tableSizeBeforeCapture) {
    var best = null;
    var bestScore = -Infinity;
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      var scopaBonus = opt.length === tableSizeBeforeCapture ? 1000 : 0;
      var coinBonus = opt.filter(function (c) { return c.suit === COINS_SUIT; }).length * 5;
      var primieraBonus = opt.reduce(function (s, c) { return s + PRIMIERA_VALUE[c.rank]; }, 0);
      var score = scopaBonus + opt.length * 10 + coinBonus + primieraBonus;
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best;
  }

  // Chooses the computer's move: which card to play, and (if it captures)
  // which option to take. Falls back to discarding the least useful card
  // when nothing can be captured.
  function aiChooseMove(hand, table) {
    var best = null; // { card, capture }
    var bestScore = -Infinity;

    for (var i = 0; i < hand.length; i++) {
      var card = hand[i];
      var options = captureOptions(card, table);
      if (!options.length) continue;
      var opt = bestOption(options, table.length);
      var scopaBonus = opt.length === table.length ? 1000 : 0;
      var coinBonus = opt.filter(function (c) { return c.suit === COINS_SUIT; }).length * 5;
      var primieraBonus = opt.reduce(function (s, c) { return s + PRIMIERA_VALUE[c.rank]; }, 0);
      var score = scopaBonus + opt.length * 10 + coinBonus + primieraBonus;
      if (score > bestScore) {
        bestScore = score;
        best = { card: card, capture: opt };
      }
    }

    if (best) return best;

    // No capture available anywhere — discard the least valuable card,
    // keeping high-primiera / coins cards in hand as long as possible.
    var worst = hand[0];
    var worstScore = Infinity;
    for (var j = 0; j < hand.length; j++) {
      var c = hand[j];
      var value = PRIMIERA_VALUE[c.rank] + (c.suit === COINS_SUIT ? 5 : 0);
      if (value < worstScore) {
        worstScore = value;
        worst = c;
      }
    }
    return { card: worst, capture: [] };
  }

  // Scores one finished round. `playerCards`/`aiCards` are each side's full
  // pile of captured cards; `playerScopas`/`aiScopas` are scopa counts.
  // Returns { playerTotal, aiTotal, breakdown }.
  function scoreRound(playerCards, aiCards, playerScopas, aiScopas) {
    var breakdown = { player: {}, ai: {} };

    // Most cards
    if (playerCards.length > aiCards.length) breakdown.player.cards = 1;
    else if (aiCards.length > playerCards.length) breakdown.ai.cards = 1;

    // Most coins (diamonds)
    var playerCoins = playerCards.filter(function (c) { return c.suit === COINS_SUIT; }).length;
    var aiCoins = aiCards.filter(function (c) { return c.suit === COINS_SUIT; }).length;
    if (playerCoins > aiCoins) breakdown.player.coins = 1;
    else if (aiCoins > playerCoins) breakdown.ai.coins = 1;

    // Sette bello — 7 of coins
    var playerHasSette = playerCards.some(function (c) { return c.suit === COINS_SUIT && c.rank === 7; });
    if (playerHasSette) breakdown.player.setteBello = 1;
    else if (aiCards.some(function (c) { return c.suit === COINS_SUIT && c.rank === 7; })) breakdown.ai.setteBello = 1;

    // Primiera — best card per suit, summed
    function primieraTotal(cards) {
      var total = 0;
      for (var s = 0; s < SUITS.length; s++) {
        var suitCards = cards.filter(function (c) { return c.suit === SUITS[s]; });
        if (!suitCards.length) continue;
        var best = Math.max.apply(null, suitCards.map(function (c) { return PRIMIERA_VALUE[c.rank]; }));
        total += best;
      }
      return total;
    }
    var playerPrimiera = primieraTotal(playerCards);
    var aiPrimiera = primieraTotal(aiCards);
    if (playerPrimiera > aiPrimiera) breakdown.player.primiera = 1;
    else if (aiPrimiera > playerPrimiera) breakdown.ai.primiera = 1;

    breakdown.player.scopas = playerScopas;
    breakdown.ai.scopas = aiScopas;

    var playerTotal =
      (breakdown.player.cards || 0) +
      (breakdown.player.coins || 0) +
      (breakdown.player.setteBello || 0) +
      (breakdown.player.primiera || 0) +
      playerScopas;
    var aiTotal =
      (breakdown.ai.cards || 0) +
      (breakdown.ai.coins || 0) +
      (breakdown.ai.setteBello || 0) +
      (breakdown.ai.primiera || 0) +
      aiScopas;

    return { playerTotal: playerTotal, aiTotal: aiTotal, breakdown: breakdown };
  }

  return {
    MATCH_TARGET: 21,
    SUITS: SUITS,
    COINS_SUIT: COINS_SUIT,
    SUIT_SYMBOLS: SUIT_SYMBOLS,
    RED_SUITS: RED_SUITS,
    RANK_LABELS: RANK_LABELS,
    buildDeck: buildDeck,
    shuffle: shuffle,
    label: label,
    cardSum: cardSum,
    captureOptions: captureOptions,
    removeCards: removeCards,
    bestOption: bestOption,
    aiChooseMove: aiChooseMove,
    scoreRound: scoreRound,
  };
})();
