import { z } from "zod";

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
      lostProvinces: z.number().optional(),
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
    }),
  ),
});

export interface GameReport {
  startedAt: Date;
  durationInMinutes: number;
  winner: string;
  winReason: string;
  gameMode: string;
  initialFirstPlayer: string;
  roundNumber: number;
  players: {
    winner: Player;
    loser: Player;
  };
}

export async function parseGameReport(
  input: unknown,
): Promise<GameReport | undefined> {
  const result = await InputSchema.safeParseAsync(input);
  if (!result.success) {
    return;
  }

  const data = result.data;
  return {
    startedAt: data.startedAt,
    durationInMinutes: differenceInMinutes(data.finishedAt, data.startedAt),
    winner: data.winner,
    winReason: data.winReason,
    gameMode: data.gameMode,
    initialFirstPlayer: data.initialFirstPlayer,
    roundNumber: data.roundNumber,
    players: data.players.reduce(
      (grouped, player) => {
        if (player.name === data.winner) {
          grouped.winner = arrangePlayer(player);
        } else {
          grouped.loser = arrangePlayer(player);
        }
        return grouped;
      },
      {} as Record<"winner" | "loser", ReturnType<typeof arrangePlayer>>,
    ),
  };
}

interface Player {
  name: string;
  honor: number;
  faction: string;
  lostProvinces: number;
  deck: {
    stronghold: string;
    role: string;
    conflictCards: Array<{ count: number; card: string }>;
    dynastyCards: Array<{ count: number; card: string }>;
    provinceCards: Array<string>;
  };
}

function arrangePlayer(input: {
  honor: number;
  name: string;
  faction: string;
  lostProvinces?: number;
  deck: {
    faction: {
      value: string;
      name: string;
    };
    stronghold: string;
    role: string;
    conflictCards: Array<string>;
    provinceCards: Array<string>;
    dynastyCards: Array<string>;
  };
}): Player {
  return {
    name: input.name,
    honor: input.honor,
    faction: input.faction,
    lostProvinces: input.lostProvinces ?? 0,
    deck: {
      stronghold: input.deck.stronghold,
      role: input.deck.role,
      provinceCards: input.deck.provinceCards,
      conflictCards: input.deck.conflictCards.map(arrangeMultiCard),
      dynastyCards: input.deck.dynastyCards.map(arrangeMultiCard),
    },
  };
}

function differenceInMinutes(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60_000);
}

function arrangeMultiCard(input: string): { count: number; card: string } {
  const [n, card] = input.split("x ");
  return {
    count: parseInt(n, 10),
    card,
  };
}
