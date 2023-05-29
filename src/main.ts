import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { initDb } from "./db.ts";

import { backfillCardData } from "./cardData.ts";
import {
  createGameReport,
  createGameReportOld,
  listPlayerStats,
} from "./routes/gameReport.ts";

const db = await initDb();

const router = new Router();
router.post("/api/game-report", createGameReportOld(db));
router.post("/api/game-report/:env", createGameReport(db));
router.get("/api/player-stats", listPlayerStats(db));
router.get("/api/game-stats", async (context) => {
  const gamesPerDay = await db.reportCollectionV2
    .aggregate([
      { $unionWith: "reports_v1" },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$startedAt",
              format: "%Y-%m-%d :: %u",
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
  context.response.body = gamesPerDay;
});

// router.post("/api/backfill", async () => {
//   await backfillStats(db);
// });

// router.post("/api/backfill/cardstats", async () => {
//   await backfillCardData(db);
// });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") ?? "8080", 10);
await app.listen({ port });
