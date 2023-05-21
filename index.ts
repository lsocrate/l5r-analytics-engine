import Bao from "baojs";

const app = new Bao();

app.post("/api/game-report", async (ctx) => {
  const json: any = await ctx.req.json();
  return ctx.sendPrettyJson(json);
});

const server = app.listen({
  port: process.env.PORT ? Number(process.env.PORT) : undefined,
});

console.log(`Listening on ${server.hostname}:${server.port}`);
