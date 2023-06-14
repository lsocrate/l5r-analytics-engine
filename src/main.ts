import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { initDb } from "./db.ts";

import { backfillCardData } from "./cardData.ts";
import { listCardStats } from "./routes/cardStats.ts";
import { backfillClanData } from "./routes/clanStats.ts";
import {
  createGameReport,
  createGameReportOld,
  listPlayerStats,
} from "./routes/gameReport.ts";
import { listGameStats } from "./routes/gameStats.ts";

const db = await initDb();

const router = new Router();
router.post("/api/game-report", createGameReportOld(db));
router.post("/api/game-report/:env", createGameReport(db));
router.get("/api/player-stats", listPlayerStats(db));
router.get("/api/game-stats", listGameStats(db));

// router.post("/api/backfill", async () => {
//   await backfillStats(db);
// });

router.post("/api/backfill/cardstats", async () => {
  await backfillCardData(db);
});
router.post("/api/backfill/clanstats", async () => {
  await backfillClanData(db);
});
router.get("/api/card-stats", listCardStats(db));

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") ?? "8080", 10);
await app.listen({ port });
