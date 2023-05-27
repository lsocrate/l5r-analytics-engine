import {
  Period,
  Player,
  Outcome,
} from "https://deno.land/x/delo@v0.1.0/mod.ts";
import type { DB, PlayerStatsDoc } from "./db.ts";

type PlayerInput = {
  name: string;
  faction: string;
};

export async function backfillStats(db: DB) {
  for await (const game of db.reportCollection.find().sort({ startedAt: 1 })) {
    const [winner, loser] = Object.values<PlayerInput>(game.players).reduce(
      (res, player) => {
        if (player.name === game.winner) {
          res[0] = player;
        } else {
          res[1] = player;
        }
        return res;
      },
      [] as PlayerInput[]
    );

    if (winner && loser) {
      await updateElo(db, winner, loser);
    }
  }
}

export async function updateElo(
  db: DB,
  winner: PlayerInput,
  loser: PlayerInput
) {
  const winnerDoc = await findDoc(db, winner);
  const loserDoc = await findDoc(db, loser);

  const period = new Period();

  const overallWinner = new Player(winnerDoc.elo.general);
  const overallLoser = new Player(loserDoc.elo.general);
  period.addGame(overallWinner, overallLoser, Outcome.WIN);

  const clanWinner = clanPart(winner, winnerDoc);
  const clanLoser = clanPart(loser, loserDoc);
  if (clanWinner && clanLoser) {
    period.addGame(clanWinner.eloPlayer, clanLoser.eloPlayer, Outcome.WIN);
  }
  period.calculate();

  const newWinnerDoc = {
    ...winnerDoc,
    elo: {
      ...winnerDoc.elo,
      general: overallWinner.rating,
      ...(clanWinner
        ? { [clanWinner.clan]: clanWinner.eloPlayer.rating }
        : undefined),
    },
  };

  const newLoserDoc = {
    ...loserDoc,
    elo: {
      ...loserDoc.elo,
      general: overallLoser.rating,
      ...(clanLoser
        ? { [clanLoser.clan]: clanLoser.eloPlayer.rating }
        : undefined),
    },
  };

  await db.playerStatsCollection.replaceOne(
    { player_name: winner.name },
    newWinnerDoc,
    { upsert: true }
  );
  await db.playerStatsCollection.replaceOne(
    { player_name: loser.name },
    newLoserDoc,
    { upsert: true }
  );
}

function clanPart(player: PlayerInput, doc: PlayerStatsDoc) {
  const clan = parseClan(player.faction);
  return clan ? { clan, eloPlayer: new Player(doc.elo[clan]) } : undefined;
}

function findDoc(db: DB, player: PlayerInput) {
  return db.playerStatsCollection.findOne({ player_name: player.name }).then(
    (doc) =>
      doc ?? {
        player_name: player.name,
        elo: {
          general: 1500,
          crab: 1500,
          crane: 1500,
          dragon: 1500,
          lion: 1500,
          phoenix: 1500,
          scorpion: 1500,
          unicorn: 1500,
        },
      }
  );
}

function parseClan(
  factionCandidate: string
): undefined | keyof PlayerStatsDoc["elo"] {
  switch (factionCandidate) {
    case "Crab Clan":
      return "crab";
    case "Crane Clan":
      return "crane";
    case "Dragon Clan":
      return "dragon";
    case "Lion Clan":
      return "lion";
    case "Phoenix Clan":
      return "phoenix";
    case "Scorpion Clan":
      return "scorpion";
    case "Unicorn Clan":
      return "unicorn";
  }
}
