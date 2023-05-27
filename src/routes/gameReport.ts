import { RouterMiddleware } from "https://deno.land/x/oak@v12.5.0/router.ts";
import { DB } from "../db.ts";
import { parseGameReport } from "../gameReport.ts";
import { updateStats } from "../playerData.ts";

function parseEnv(candidate: string) {
  switch (candidate) {
    case "live":
    case "playtest":
      return candidate;
    default:
      return undefined;
  }
}

export const createGameReport =
  (db: DB): RouterMiddleware<"/api/game-report/:env"> =>
  async (context) => {
    const env = parseEnv(context.params.env);
    const parsedPayload = await context.request
      .body({ type: "json" })
      .value.then(parseGameReport);
    if (!parsedPayload || !env) {
      return;
    }

    try {
      if (env === "playtest") {
        await db.reportCollectionV2_pt.insertOne(parsedPayload);
      } else {
        await db.reportCollectionV2.insertOne(parsedPayload);
        await updateStats(
          db,
          parsedPayload.players.winner,
          parsedPayload.players.loser
        );
      }
    } catch (e) {
      console.error(e);
      return;
    }
    context.response.status = 201;
    return;
  };

export const createGameReportOld =
  (db: DB): RouterMiddleware<"/api/game-report"> =>
  async (context) => {
    const parsedPayload = await context.request
      .body({ type: "json" })
      .value.then(parseGameReport);
    if (!parsedPayload) {
      return;
    }

    try {
      await db.reportCollectionV2.insertOne(parsedPayload);
      await updateStats(
        db,
        parsedPayload.players.winner,
        parsedPayload.players.loser
      );
    } catch (e) {
      console.error(e);
      return;
    }
    context.response.status = 201;
    return;
  };
