import { parseClan } from "../data/clan.ts";
import { ClanStatsDoc, DB, Faction } from "../db.ts";
import { rate } from "../libs/openskill.ts";

export async function backfillClanData(db: DB) {
  const inMemory = new Map<Faction, ClanStatsDoc>();
  for await (const game of db.reportCollection
    .find({ gameMode: "emerald" })
    .sort({ startedAt: 1 })) {
    const [winner, loser] = Object.values(game.players).reduce(
      (res, player) => {
        if (!player) {
          return res;
        }

        const faction = parseClan(player.faction);
        if (!faction) {
          return res;
        }

        if (player.name === game.winner) {
          res[0] = faction;
        } else {
          res[1] = faction;
        }

        return res;
      },
      [] as Faction[]
    );

    if (winner && loser) {
      backfillProcess(inMemory, winner, loser);
    }
  }

  for await (const game of db.reportCollectionV2
    .find({ gameMode: "emerald" })
    .sort({ startedAt: 1 })) {
    const winner = parseClan(game.players.winner.faction);
    const loser = parseClan(game.players.loser.faction);
    if (winner && loser) {
      backfillProcess(inMemory, winner, loser);
    }
  }

  await db.clanStatsCollection.insertMany(Array.from(inMemory.values()));
}

function backfillProcess(
  inMemory: Map<Faction, ClanStatsDoc>,
  winner: Faction,
  loser: Faction
) {
  const oldWinnerDoc = inMemory.get(winner) ?? newClanStats(winner);
  const oldLoserDoc = inMemory.get(loser) ?? newClanStats(loser);

  const [[newWinnerStats], [newLoserStats]] = rate([
    [oldWinnerDoc],
    [oldLoserDoc],
  ]);

  const newWinnerDoc: ClanStatsDoc = {
    ...oldWinnerDoc,
    mu: newWinnerStats.mu,
    sigma: newWinnerStats.sigma,
    winVersus: {
      ...oldWinnerDoc.winVersus,
      [loser]: {
        value:
          (oldLoserDoc.winVersus[loser].value *
            oldLoserDoc.winVersus[loser].games +
            100) /
          (oldLoserDoc.winVersus[loser].games + 1),
        games: oldLoserDoc.winVersus[loser].games + 1,
      },
    },
  };
  const newLoserDoc: ClanStatsDoc = {
    ...oldLoserDoc,
    mu: newLoserStats.mu,
    sigma: newLoserStats.sigma,
    winVersus: {
      ...oldLoserDoc.winVersus,
      [winner]: {
        value:
          (oldLoserDoc.winVersus[winner].value *
            oldLoserDoc.winVersus[winner].games +
            0) /
          (oldLoserDoc.winVersus[winner].games + 1),
        games: oldLoserDoc.winVersus[winner].games + 1,
      },
    },
  };
  inMemory.set(winner, newWinnerDoc);
  inMemory.set(loser, newLoserDoc);
}

function newClanStats(faction: Faction): ClanStatsDoc {
  return {
    clan: faction,
    mu: 25,
    sigma: 8.333333,
    winVersus: {
      crab: { value: 50, games: 2 },
      crane: { value: 50, games: 2 },
      dragon: { value: 50, games: 2 },
      lion: { value: 50, games: 2 },
      phoenix: { value: 50, games: 2 },
      scorpion: { value: 50, games: 2 },
      unicorn: { value: 50, games: 2 },
    },
  };
}
