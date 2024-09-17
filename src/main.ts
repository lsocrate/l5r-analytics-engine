import { aggregateGamesPerDay, insertGameReport } from "./db";
import type { JigokuEnv } from "./jigoku_env";
import { parseGameReport } from "./parse_game_report";

const server = Bun.serve({
  port: process.env.PORT!,
  fetch(req) {
    return route(req);
  },
});

console.log(`Listening on port ${server.port}`);

function route(req: Request) {
  const url = new URL(req.url);
  switch (`${req.method} ${url.pathname}`) {
    case "POST /api/game-report/live":
      return createGameReport(req, "live");
    case "POST /api/game-report/playtest":
      return createGameReport(req, "playtest");
    case "GET /api/game-stats":
      return listGameStats(req);
    default:
      return new Response("Not found", { status: 404 });
  }
}

async function createGameReport(req: Request, env: JigokuEnv) {
  const body = await req.json();
  const report = await parseGameReport(body);
  if (!report) return new Response("Invalid game report", { status: 400 });

  await insertGameReport(report, env);
  return new Response("Created", { status: 201 });
}

async function listGameStats(_req: Request) {
  const gamesPerDay = await aggregateGamesPerDay();
  return Response.json(gamesPerDay);
}
