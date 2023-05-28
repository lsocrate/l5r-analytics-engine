import { rating, rate } from "npm:openskill@^3.1.0";
import { Rating } from "../../../Library/Caches/deno/npm/registry.npmjs.org/openskill/3.1.0/dist/types.d.ts";
import { DB, Deck } from "./db.ts";

function deckToTeam(deck: Deck) {
  const allCards = [`${deck.stronghold}@1`, `${deck.role}@1`];
  for (const province of deck.provinceCards) {
    allCards.push(`${province}@1`);
  }
  for (const entry of deck.dynastyCards) {
    for (let i = 1; i <= entry.count; i++) {
      allCards.push(`${entry.card}@${i}`);
    }
  }
  for (const entry of deck.conflictCards) {
    for (let i = 1; i <= entry.count; i++) {
      allCards.push(`${entry.card}@${i}`);
    }
  }
  return allCards.sort();
}

function rateCardsInMatchup(
  store: Map<string, Rating>,
  winnerDeck: Deck,
  loserDeck: Deck
) {
  const winnerCards = deckToTeam(winnerDeck);
  const loserCards = deckToTeam(loserDeck);

  const winnerTeam = winnerCards.map((key) => store.get(key) ?? rating());
  const loserTeam = loserCards.map((key) => store.get(key) ?? rating());

  const [newWinnerTeam, newLoserTeam] = rate([winnerTeam, loserTeam]);
  const updates = [] as Array<{ card: string; rating: Rating }>;
  for (let i = 0, length = winnerCards.length; i < length; i++) {
    const card = winnerCards[i];
    const rating = newWinnerTeam[i];
    if (!loserCards.includes(card)) {
      updates.push({ card, rating });
    }
  }
  for (let i = 0, length = loserCards.length; i < length; i++) {
    const card = loserCards[i];
    const rating = newLoserTeam[i];
    if (!winnerCards.includes(card)) {
      updates.push({ card, rating });
    }
  }
  return updates;
}

export async function backfillCardData(db: DB) {
  for await (const game of db.reportCollection.find().sort({ startedAt: 1 })) {
    const [winner, loser] = Object.values(game.players).reduce(
      (res, player) => {
        if (!player) {
          return res;
        }
        if (player.name === game.winner) {
          res[0] = player.deck;
        } else {
          res[1] = player.deck;
        }
        return res;
      },
      [] as Deck[]
    );

    if (winner && loser) {
      await backfillProcess(db, winner, loser);
    }
  }

  for await (const game of db.reportCollectionV2
    .find()
    .sort({ startedAt: 1 })) {
    const winner = game.players.winner.deck;
    const loser = game.players.loser.deck;
    if (winner && loser) {
      await backfillProcess(db, winner, loser);
    }
  }
}

async function backfillProcess(db: DB, winner: Deck, loser: Deck) {
  const oldStats = await db.cardStatsCollection
    .aggregate([{ $project: { card_entry: 1, mu: 1, sigma: 1 } }])
    .toArray();
  const store = new Map(
    oldStats.map((entry) => [
      entry.card_entry,
      { mu: entry.mu, sigma: entry.sigma },
    ])
  );
  for (const newRating of rateCardsInMatchup(store, winner, loser)) {
    await db.cardStatsCollection.replaceOne(
      { card_entry: newRating.card },
      {
        card_id: newRating.card.split("@")[0],
        card_entry: newRating.card,
        mu: newRating.rating.mu,
        sigma: newRating.rating.sigma,
      },
      { upsert: true }
    );
  }
}
