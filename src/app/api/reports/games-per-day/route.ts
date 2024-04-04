import { getGamesPerDay } from "@/db/db";

export async function GET() {
  const gamesPerDayCursor = await getGamesPerDay();
  const gamesPerDay = await gamesPerDayCursor.toArray();
  return Response.json(gamesPerDay);
}

