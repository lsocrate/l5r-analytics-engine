import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

const InputSchema = z.object({
  gameId: z.string(),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date(),
  winner: z.string(),
  winReason: z.string(),
  gameMode: z.string(),
  initialFirstPlayer: z.string(),
  roundNumber: z.number().int(),
  players: z.array(
    z.object({
      honor: z.number().int(),
      name: z.string(),
      faction: z.string(),
      deck: z.object({
        faction: z.object({
          name: z.string(),
          value: z.string(),
        }),
        stronghold: z.string(),
        role: z.string(),
        conflictCards: z.array(z.string()),
        dynastyCards: z.array(z.string()),
        provinceCards: z.array(z.string()),
      }),
    })
  ),
});

export async function parseGameReport(input: unknown) {
  const result = await InputSchema.safeParseAsync(input);
  if (!result.success) {
    return;
  }

  return {
    startedAt: result.data.startedAt,
    finishedAt: result.data.finishedAt,
    winner: result.data.winner,
    winReason: result.data.winReason,
    gameMode: result.data.gameMode,
    initialFirstPlayer: result.data.initialFirstPlayer,
    roundNumber: result.data.roundNumber,
    players: result.data.players.reduce((grouped, player) => {
      grouped[player.name] = arrangePlayer(player);
      return grouped;
    }, {} as Partial<Record<string, ReturnType<typeof arrangePlayer>>>),
  };
}

function arrangePlayer(input: {
  honor: number;
  name: string;
  faction: string;
  deck: {
    faction: {
      value: string;
      name: string;
    };
    stronghold: string;
    role: string;
    conflictCards: string[];
    dynastyCards: string[];
    provinceCards: string[];
  };
}) {
  return {
    name: input.name,
    honor: input.honor,
    faction: input.faction,
    deck: {
      stronghold: input.deck.stronghold,
      role: input.deck.role,
      provinceCards: input.deck.provinceCards,
      conflictCards: input.deck.conflictCards.map(arrangeMultiCard),
      dynastyCards: input.deck.dynastyCards.map(arrangeMultiCard),
    },
  };
}

function arrangeMultiCard(input: string): { count: number; card: string } {
  const [n, card] = input.split("x ");
  return {
    count: parseInt(n, 10),
    card,
  };
}
