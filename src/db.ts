import { MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";

const client = new MongoClient();

export type Faction =
  | "crab"
  | "crane"
  | "dragon"
  | "lion"
  | "phoenix"
  | "scorpion"
  | "unicorn";

export type PlayerStatsDoc = {
  player_name: string;
  elo: Record<Faction | "general", number>;
  openSkill: Record<Faction | "general", { mu: number; sigma: number }>;
};

export type CardStatsDoc = {
  card_id: string;
  card_entry: string;
  mu: number;
  sigma: number;
};

export type ClanStatsDoc = {
  clan: Faction;
  mu: number;
  sigma: number;
  winVersus: Record<
    Faction,
    {
      value: number;
      games: number;
    }
  >;
};

export type DB = Awaited<ReturnType<typeof initDb>>;

export type Deck = {
  stronghold: string;
  role: string;
  provinceCards: string[];
  conflictCards: Array<{ count: number; card: string }>;
  dynastyCards: Array<{ count: number; card: string }>;
};

export type ReportV1 = {
  startedAt: Date;
  winner: string;
  winReason: string;
  gameMode: string;
  initialFirstPlayer: string;
  roundNumber: number;
  players: Record<
    string,
    | undefined
    | {
        name: string;
        honor: number;
        faction: string;
        deck: Deck;
      }
  >;
};

export type ReportV2 = {
  startedAt: Date;
  durationInMinutes: number;
  winner: string;
  winReason: string;
  gameMode: string;
  initialFirstPlayer: string;
  roundNumber: number;
  players: Record<
    "loser" | "winner",
    {
      name: string;
      honor: number;
      faction: string;
      deck: Deck;
    }
  >;
};

export async function initDb() {
  await client.connect(Deno.env.get("MONGO_URL")!);
  const db = client.database("prod");
  return {
    db,
    reportCollection: db.collection<ReportV1>("reports_v1"),
    reportCollectionV2: db.collection<ReportV2>("reports_v2"),
    reportCollectionV2_pt: db.collection<ReportV2>("reports_v2_pt"),
    playerStatsCollection: db.collection<PlayerStatsDoc>("player_stats_v1"),
    cardStatsCollection: db.collection<CardStatsDoc>("card_stats_v1"),
    clanStatsCollection: db.collection<ClanStatsDoc>("clan_stats_v1"),
  };
}
