import { Db, MongoClient } from "mongodb";
import type { GameReport } from "./parse_game_report";
import type { JigokuEnv } from "./jigoku_env";

const client = new MongoClient(process.env.MONGODB_URL!);
const dbName = "prod";

export async function insertGameReport(report: GameReport, env: JigokuEnv) {
  return withConnection(async (db) => {
    const collection = db.collection<GameReport>(
      env === "live" ? "reports_v2" : "reports_v2_pt",
    );
    await collection.insertOne(report);
  });
}

export async function aggregateGamesPerDay() {
  return withConnection(async (db) => {
    const collection = db.collection<GameReport>("reports_v2");
    return collection
      .aggregate<{ day: string; gamesOnDay: number }>([
        { $unionWith: "reports_v1" },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$startedAt",
                format: "%Y-%m-%d",
                timezone: "-08",
              },
            },
            gamesOnDay: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            day: "$_id",
            gamesOnDay: 1,
          },
        },
        { $sort: { day: 1 } },
      ])
      .toArray();
  });
}

async function withConnection<T>(process: (db: Db) => Promise<T>): Promise<T> {
  const con = await client.connect();
  const db = con.db(dbName);
  const res = await process(db);
  await con.close();
  return res;
}
