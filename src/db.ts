import {
  Collection,
  Database,
  Document,
  MongoClient,
} from "https://deno.land/x/mongo@v0.31.2/mod.ts";

const client = new MongoClient();

export type PlayerStatsDoc = {
  player_name: string;
  elo: {
    general: number;
    crab: number;
    crane: number;
    dragon: number;
    lion: number;
    phoenix: number;
    scorpion: number;
    unicorn: number;
  };
};

export type DB = {
  db: Database;
  reportCollection: Collection<Document>;
  playerStatsCollection: Collection<PlayerStatsDoc>;
};

export async function initDb(): Promise<DB> {
  await client.connect(Deno.env.get("MONGO_URL")!);
  const db = client.database("prod");
  const reportCollection = db.collection("reports_v1");
  const playerStatsCollection =
    db.collection<PlayerStatsDoc>("player_stats_v1");

  return { db, reportCollection, playerStatsCollection };
}
