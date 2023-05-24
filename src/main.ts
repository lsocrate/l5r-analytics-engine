import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { initDb } from "./db.ts";
import { parseGameReport } from "./gameReport.ts";
import { PlayerInput, eloThing } from "./playerData.ts";

const db = await initDb();

const router = new Router();
router.post("/api/game-report", async (context) => {
  const payload = await context.request.body({ type: "json" }).value;
  const parsed = await parseGameReport(payload);
  if (!parsed) {
    return;
  }

  const pis = Object.values(parsed.players).reduce(
    (g, p) => {
      if (p?.name === parsed.winner) {
        g.winner = p;
      } else {
        g.loser = p;
      }
      return g;
    },
    { winner: undefined, loser: undefined } as {
      winner?: PlayerInput;
      loser?: PlayerInput;
    }
  );

  try {
    await db.reportCollection.insertOne(parsed);
    if (pis.winner && pis.loser) {
      await eloThing(db, pis.winner, pis.loser);
    }
  } catch (e) {
    console.error(e);
    return;
  }
  context.response.status = 201;
  return;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") ?? "8080", 10);
await app.listen({ port });
