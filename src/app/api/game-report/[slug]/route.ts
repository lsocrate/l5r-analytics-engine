import { parseGameReport } from "@/data/gameReport";
import { getPlayerStats, storeReport } from "@/db/db";

function parseEnv(candidate: string) {
  switch (candidate) {
    case "live":
    case "playtest":
      return candidate;
    default:
      return undefined;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const env = parseEnv(params.slug);
  if (!env) {
    return new Response(null, { status: 400 });
  }

  const parsedPayload = await request
    .json()
    .catch(() => undefined)
    .then(parseGameReport);
  if (!parsedPayload) {
    return new Response(null, { status: 400 });
  }

  await storeReport(env, parsedPayload);
  if (env === "live") {
    const oldStats = await Promise.all([
      getPlayerStats(parsedPayload.players.winner.name),
      getPlayerStats(parsedPayload.players.loser.name),
    ]).then(([winner, loser]) => ({ winner, loser }));

    const newStats = calculateNewStats(oldStats)
  }

  return new Response(`Hello ${env}`);
}
