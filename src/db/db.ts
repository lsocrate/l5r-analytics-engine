import { PlayerStatsDoc, initialPlayerStats } from "@/data/playerData";
import { ZonedDateTime, convert } from "@js-joda/core";
import { AggregationCursor, Db, MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_CONNECTION!);

let connectedClient: Promise<Db> | null = null;
function getClient() {
  if (connectedClient === null) {
    connectedClient = client.connect().then((client) => client.db("prod"));
  }
  return connectedClient;
}

type ReportV2 = {
  startedAt: ZonedDateTime;
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

type Deck = {
  stronghold: string;
  role: string;
  provinceCards: string[];
  conflictCards: Array<{ count: number; card: string }>;
  dynastyCards: Array<{ count: number; card: string }>;
};

export async function storeReport(env: "live" | "playtest", report: ReportV2) {
  const db = await getClient();
  const collection = db.collection(
    env === "live" ? "reports_v2" : "reports_v2_pt",
  );

  await collection.insertOne(
    Object.assign({}, report, {
      startedAt: convert(report.startedAt).toDate(),
    }),
  );
}

export async function getMAU(): Promise<
  AggregationCursor<{ month: string; mau: number }>
> {
  const db = await getClient();
  return db.collection("reports_v2").aggregate<{ month: string; mau: number }>([
    { $match: { gameMode: "emerald" } },
    {
      $project: {
        _id: 0,
        players: [
          {
            name: "$players.loser.name",
            month: { $dateToString: { format: "%Y-%m", date: "$startedAt" } },
          },
          {
            name: "$players.winner.name",
            month: { $dateToString: { format: "%Y-%m", date: "$startedAt" } },
          },
        ],
      },
    },
    { $unwind: "$players" },
    {
      $group: {
        _id: "$players.month",
        mau: { $addToSet: "$players.name" },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id",
        mau: { $size: "$mau" },
      },
    },
    { $sort: { month: -1 } },
  ]);
}

export async function getGamesPerDay() {
  const db = await getClient();
  return db
    .collection("reports_v2")
    .aggregate<{ day: string; gamesOnDay: number }>([
      { $unionWith: "reports_v1" },
      { $match: { gameMode: "emerald" } },
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
      { $sort: { day: -1 } },
    ]);
}

export async function getPlayerStats(playerName: string) {
  const db = await getClient();
  return db
    .collection("player_stats_v1")
    .findOne<PlayerStatsDoc>({ player_name: playerName })
    .then((doc) => doc ?? initialPlayerStats(playerName));
}
