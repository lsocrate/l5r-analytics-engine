import { RouterMiddleware } from "https://deno.land/x/oak@v12.5.0/router.ts";
import { DB } from "../db.ts";

export const listGameStats =
  (db: DB): RouterMiddleware<"/api/game-stats"> =>
  async (context) => {
    const gamesPerDay = await db.reportCollectionV2
      .aggregate([
        { $unionWith: "reports_v1" },
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
        { $sort: { day: 1 } },
      ])
      .toArray();
    context.response.body = gamesPerDay;
  };
