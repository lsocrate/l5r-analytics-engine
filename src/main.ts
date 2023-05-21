import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { initDb } from "./db.ts";

const db = await initDb();
const router = new Router();
router.post("/api/game-report", async (context) => {
  const payload = await context.request.body({ type: "json" }).value;
  const res = await db.reportCollection.insertOne(payload);
  context.response.body = res;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = parseInt(Deno.env.get("PORT") ?? "8080", 10);
await app.listen({ port });
