import type { Faction } from "../db.ts";

export function parseClan(factionCandidate: string): undefined | Faction {
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
