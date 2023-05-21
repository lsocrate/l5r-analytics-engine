import { MongoClient } from "mongodb";

export async function initDb() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db("prod");
  const reportCollection = db.collection("reports_v1");

  return { db, reportCollection };
}
