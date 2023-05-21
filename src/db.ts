import { MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";

const client = new MongoClient();

export async function initDb() {
  await client.connect(Deno.env.get("MONGO_URL")!);
  const db = client.database("prod");
  const reportCollection = db.collection("reports_v1");

  return { db, reportCollection };
}
