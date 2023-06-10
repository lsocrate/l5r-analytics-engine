import { RouterMiddleware } from "https://deno.land/x/oak@v12.5.0/router.ts";
import { DB } from "../db.ts";

export const listCardStats =
  (db: DB): RouterMiddleware<"/api/card-stats"> =>
  async (context) => {
    const stats = await db.cardStatsCollection
      .aggregate([
        {
          $group: {
            _id: "$card_id",
            mu: { $avg: "$mu" },
            sigma: { $avg: "$sigma" },
          },
        },
        {
          $project: {
            _id: 0,
            card: "$_id",
            openSkill: {
              $let: {
                vars: { mean: "$mu", s3: { $multiply: ["$sigma", 3] } },
                in: { $subtract: ["$$mean", "$$s3"] },
              },
            },
          },
        },
        { $sort: { openSkill: -1 } },
      ])
      .toArray();
    context.response.body = stats;
    context.response.status = 200;
  };
