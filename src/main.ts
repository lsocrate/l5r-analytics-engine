import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { initDb } from "./db.ts";

import { createGameReport } from "./routes/gameReport.ts";
import { backfillStats } from "./playerData.ts";

const db = await initDb();

const router = new Router();
router.post("/api/game-report/:env", createGameReport(db));
router.post("/api/backfill", async () => {
  await backfillStats(db);
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") ?? "8080", 10);
await app.listen({ port });
