import {
  Period,
  Player,
  Outcome,
} from "https://deno.land/x/delo@v0.1.0/mod.ts";
import type { DB, Faction, PlayerStatsDoc } from "./db.ts";
import { rating, rate } from "https://esm.sh/openskill@3.1.0";

type PlayerInput = {
  name: string;
  faction: string;
};

export async function updateStats(
  db: DB,
  winner: PlayerInput,
  loser: PlayerInput
) {
  const winnerDoc = await findDoc(db, winner);
  const loserDoc = await findDoc(db, loser);

  const [newWinnerOpenSkill, newLoserOpenSkill] = calcTrueSkill(
    { player: winner, old: winnerDoc.openSkill },
    { player: loser, old: loserDoc.openSkill }
  );

  const [newWinnerElo, newLoserElo] = calcElo(
    { player: winner, old: winnerDoc.elo },
    { player: loser, old: loserDoc.elo }
  );

  await db.playerStatsCollection.replaceOne(
    { player_name: winner.name },
    { ...winnerDoc, elo: newWinnerElo, openSkill: newWinnerOpenSkill },
    { upsert: true }
  );
  await db.playerStatsCollection.replaceOne(
    { player_name: loser.name },
    { ...loserDoc, elo: newLoserElo, openSkill: newLoserOpenSkill },
    { upsert: true }
  );
}

export async function backfillStats(db: DB) {
  for await (const game of db.reportCollection.find().sort({ startedAt: 1 })) {
    const [winner, loser] = Object.values(game.players).reduce(
      (res, player) => {
        if (!player) {
          return res;
        }

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
      await updateStats(db, winner, loser);
    }
  }
}

type EloInput = {
  player: PlayerInput;
  old: PlayerStatsDoc["elo"];
};

export function calcElo(winner: EloInput, loser: EloInput) {
  const period = new Period();

  const overallWinner = new Player(winner.old.general);
  const overallLoser = new Player(loser.old.general);
  period.addGame(overallWinner, overallLoser, Outcome.WIN);

  const winnerFaction = parseClan(winner.player.faction);
  let factionWinner: undefined | Player;
  const loserFaction = parseClan(loser.player.faction);
  let factionLoser: undefined | Player;
  if (winnerFaction && loserFaction) {
    factionWinner = new Player(winner.old[winnerFaction]);
    factionLoser = new Player(winner.old[winnerFaction]);
    period.addGame(factionWinner, factionLoser, Outcome.WIN);
  }

  period.calculate();

  return [
    {
      ...winner.old,
      general: overallWinner.rating,
      ...(winnerFaction && factionWinner
        ? { [winnerFaction]: factionWinner.rating }
        : undefined),
    },
    {
      ...loser.old,
      general: overallLoser.rating,
      ...(loserFaction && factionLoser
        ? { [loserFaction]: factionLoser.rating }
        : undefined),
    },
  ];
}

export function initPlayerStats(playerName: string) {
  return {
    player_name: playerName,
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
    openSkill: {
      general: { mu: 25, sigma: 8.333333 },
      crab: { mu: 25, sigma: 8.333333 },
      crane: { mu: 25, sigma: 8.333333 },
      dragon: { mu: 25, sigma: 8.333333 },
      lion: { mu: 25, sigma: 8.333333 },
      phoenix: { mu: 25, sigma: 8.333333 },
      scorpion: { mu: 25, sigma: 8.333333 },
      unicorn: { mu: 25, sigma: 8.333333 },
    },
  };
}
function findDoc(db: DB, player: PlayerInput) {
  return db.playerStatsCollection
    .findOne({ player_name: player.name })
    .then((doc) => doc ?? initPlayerStats(player.name));
}

function parseClan(factionCandidate: string): undefined | Faction {
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

type TrueSkillInput = {
  player: PlayerInput;
  old: PlayerStatsDoc["openSkill"];
};

function calcTrueSkill(
  winner: TrueSkillInput,
  loser: TrueSkillInput
): [TrueSkillInput["old"], TrueSkillInput["old"]] {
  const winnerNew = winner.old;
  const loserNew = loser.old;

  const general = rate([
    [rating(winner.old.general)],
    [rating(loser.old.general)],
  ]);
  const [[winnerGeneralNew], [loserGeneralNew]] = general;
  winnerNew.general = winnerGeneralNew;
  loserNew.general = loserGeneralNew;

  const winnerFaction = parseClan(winner.player.faction);
  const loserFaction = parseClan(loser.player.faction);
  if (winnerFaction && loserFaction) {
    const [[winnerFactionNew], [loserFactionNew]] = rate([
      [rating(winner.old[winnerFaction])],
      [rating(loser.old[loserFaction])],
    ]);

    winnerNew[winnerFaction] = winnerFactionNew;
    loserNew[loserFaction] = loserFactionNew;
  }

  return [winnerNew, loserNew];
}
