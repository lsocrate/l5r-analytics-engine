import { rate, rating } from "openskill";
import type { Faction } from "./faction";

export type PlayerStatsDoc = {
  player_name: string;
  elo: Record<Faction | "general", number>;
  openSkill: Record<Faction | "general", { mu: number; sigma: number }>;
};

export function initialPlayerStats(playerName: string): PlayerStatsDoc {
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

export function calculateNewStats(
  oldStats: { winner: PlayerStatsDoc; loser: PlayerStatsDoc },
  factions: Partial<{ winner: Faction; loser: Faction }>,
) {
  const [[newWinnerGeneral], [newLoserGeneral]] = rate([
    [rating(oldStats.winner.openSkill.general)],
    [rating(oldStats.loser.openSkill.general)],
  ]);

  const newStats = {
    winner: {
      ...oldStats.winner,
      openSkill: {
        ...oldStats.winner.openSkill,
        general: {
          mu: newWinnerGeneral.mu,
          sigma: newWinnerGeneral.sigma,
        },
      },
    },
    loser: {
      ...oldStats.loser,
      openSkill: {
        ...oldStats.loser.openSkill,
        general: {
          mu: newLoserGeneral.mu,
          sigma: newLoserGeneral.sigma,
        },
      },
    },
  };

  if (factions.winner && factions.loser) {
    const [[newWinnerFaction], [newLoserFaction]] = rate([
      [rating(oldStats.winner.openSkill[factions.winner])],
      [rating(oldStats.loser.openSkill[factions.loser])],
    ]);
    newStats.winner.openSkill[factions.winner] = newWinnerFaction;
    newStats.loser.openSkill[factions.loser] = newLoserFaction;
  }

  return newStats;
}
