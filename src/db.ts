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

export type DB = Awaited<ReturnType<typeof initDb>>;

export async function initDb() {
  await client.connect(Deno.env.get("MONGO_URL")!);
  const db = client.database("prod");
  return {
    db,
    reportCollection: db.collection("reports_v1"),
    reportCollectionV2: db.collection("reports_v2"),
    reportCollectionV2_pt: db.collection("reports_v2_pt"),
    playerStatsCollection: db.collection<PlayerStatsDoc>("player_stats_v1"),
  };
}
