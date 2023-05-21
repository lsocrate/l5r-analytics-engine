import Bao from "baojs";

const app = new Bao();

app.post("/api/game-report", async (ctx) => {
  const json: any = await ctx.req.json();
  return ctx.sendPrettyJson(json);
});

const server = app.listen({
  port: process.env.NODE_ENV ? Number(process.env.NODE_ENV) : undefined,
});

console.log(`Listening on ${server.hostname}:${server.port}`);
