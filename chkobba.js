// Chkobba (the Tunisian card game) — a complete engine (you vs the
// computer), pure logic, no DOM. Matches the real system as played in
// Tunisia / documented on chkobbeta.tn (chkobbeta.tn/rules) — this is
// NOT plain Italian Scopa, the scoring categories differ:
//
//   - 40 cards, 4 suits, ranks 1-10 — shown and called entirely by
//     number (no J/Q/K letters).
//   - Deal: 3 cards to each player + 4 face-up on the table. If 3 or 4 of
//     those 4 table cards share the same rank, the deal is void and
//     redealt (isVoidTableDeal below) — a "sure thing" opening capture
//     isn't allowed to just happen by chance.
//   - Once both hands are empty, 3 more cards are dealt to each side —
//     six such batches get through the full 40-card deck (4 went to the
//     table, 36 remain = 6 batches of 3+3). No more cards are ever added
//     to the table after the opening deal.
//   - Capture: your played card takes a table card of the same rank, OR
//     a combination of table cards that sum to its rank — same-rank
//     single-card capture always takes priority when both are possible.
//     Emptying the table completely in one capture is a "chkobba", worth
//     an extra point — except the dealer can't score a chkobba with the
//     very last card of the hand (isLastCardOfHand handling lives in
//     game.js, which also fixes the computer as the permanent "dealer").
//   - Whatever's left on the table when the deck runs out goes to
//     whoever made the last capture.
//   - Four scoring categories per hand, plus one point per chkobba:
//       Karta   — most cards captured overall.
//       Dineri  — most diamonds captured (diamonds = the "coins" suit).
//       Bermila — most 7s captured; if tied, most 6s captured decides it.
//       7ayya   — whoever captured the 7 of diamonds.
//   - A MATCH isn't decided by one hand: hands keep getting dealt and
//     scored until someone's running total reaches MATCH_TARGET (21)
//     points and it isn't tied — same as it's actually played.
window.Chkobba = (function () {
  var SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  var COINS_SUIT = 'diamonds'; // the "dineri" suit
  var SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  var RED_SUITS = { hearts: true, diamonds: true };
  // Tunisian Chkobba is played and called entirely by number — no J/Q/K.
  var RANK_LABELS = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' };

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

  function countRank(cards, rank) {
    var n = 0;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].rank === rank) n++;
    }
    return n;
  }

  // The opening 4-card table deal is void (and must be redealt) if 3 or
  // 4 of those cards share the same rank.
  function isVoidTableDeal(tableCards) {
    var byRank = {};
    for (var i = 0; i < tableCards.length; i++) {
      var r = tableCards[i].rank;
      byRank[r] = (byRank[r] || 0) + 1;
      if (byRank[r] >= 3) return true;
    }
    return false;
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

  // Rough value the AI assigns to a set of cards it's considering taking —
  // weighted toward what actually scores points under the real Tunisian
  // categories (bermila = 7s/6s count, 7ayya = the 7 of diamonds
  // specifically, dineri = diamonds count) rather than classic primiera.
  function captureValue(cards) {
    var value = 0;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.suit === COINS_SUIT && c.rank === 7) value += 30; // the 7ayya card itself
      else if (c.rank === 7) value += 12; // counts toward bermila
      else if (c.rank === 6) value += 4; // bermila's tiebreaker
      if (c.suit === COINS_SUIT) value += 5; // counts toward dineri
    }
    return value;
  }

  // Picks the best capture option for a hypothetical play of `card` — prefers
  // a scopa (clears the table), then the option with the most cards, then the
  // option worth the most toward dineri/bermila/7ayya.
  function bestOption(options, tableSizeBeforeCapture) {
    var best = null;
    var bestScore = -Infinity;
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      var scopaBonus = opt.length === tableSizeBeforeCapture ? 1000 : 0;
      var score = scopaBonus + opt.length * 10 + captureValue(opt);
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
      var score = scopaBonus + opt.length * 10 + captureValue(opt);
      if (score > bestScore) {
        bestScore = score;
        best = { card: card, capture: opt };
      }
    }

    if (best) return best;

    // No capture available anywhere — discard the least valuable card,
    // keeping high-value cards (7s, 6s, diamonds) in hand as long as possible.
    var worst = hand[0];
    var worstScore = Infinity;
    for (var j = 0; j < hand.length; j++) {
      var c = hand[j];
      var value = captureValue([c]);
      if (value < worstScore) {
        worstScore = value;
        worst = c;
      }
    }
    return { card: worst, capture: [] };
  }

  // Scores one finished hand. `playerCards`/`aiCards` are each side's full
  // pile of captured cards; `playerScopas`/`aiScopas` are chkobba counts.
  // Returns { playerTotal, aiTotal, breakdown }.
  function scoreRound(playerCards, aiCards, playerScopas, aiScopas) {
    var breakdown = { player: {}, ai: {} };

    // Karta — most cards captured overall.
    if (playerCards.length > aiCards.length) breakdown.player.cards = 1;
    else if (aiCards.length > playerCards.length) breakdown.ai.cards = 1;

    // Dineri — most diamonds captured.
    var playerCoins = playerCards.filter(function (c) { return c.suit === COINS_SUIT; }).length;
    var aiCoins = aiCards.filter(function (c) { return c.suit === COINS_SUIT; }).length;
    if (playerCoins > aiCoins) breakdown.player.coins = 1;
    else if (aiCoins > playerCoins) breakdown.ai.coins = 1;

    // 7ayya — whoever captured the 7 of diamonds.
    var playerHasHayya = playerCards.some(function (c) { return c.suit === COINS_SUIT && c.rank === 7; });
    if (playerHasHayya) breakdown.player.hayya = 1;
    else if (aiCards.some(function (c) { return c.suit === COINS_SUIT && c.rank === 7; })) breakdown.ai.hayya = 1;

    // Bermila — most 7s captured; tied on 7s is broken by most 6s captured.
    var playerSevens = countRank(playerCards, 7);
    var aiSevens = countRank(aiCards, 7);
    if (playerSevens > aiSevens) {
      breakdown.player.bermila = 1;
    } else if (aiSevens > playerSevens) {
      breakdown.ai.bermila = 1;
    } else {
      var playerSixes = countRank(playerCards, 6);
      var aiSixes = countRank(aiCards, 6);
      if (playerSixes > aiSixes) breakdown.player.bermila = 1;
      else if (aiSixes > playerSixes) breakdown.ai.bermila = 1;
      // still tied even on sixes — nobody scores it
    }

    breakdown.player.scopas = playerScopas;
    breakdown.ai.scopas = aiScopas;

    var playerTotal =
      (breakdown.player.cards || 0) +
      (breakdown.player.coins || 0) +
      (breakdown.player.hayya || 0) +
      (breakdown.player.bermila || 0) +
      playerScopas;
    var aiTotal =
      (breakdown.ai.cards || 0) +
      (breakdown.ai.coins || 0) +
      (breakdown.ai.hayya || 0) +
      (breakdown.ai.bermila || 0) +
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
    isVoidTableDeal: isVoidTableDeal,
    captureOptions: captureOptions,
    removeCards: removeCards,
    bestOption: bestOption,
    aiChooseMove: aiChooseMove,
    scoreRound: scoreRound,
  };
})();
