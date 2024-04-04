import { DateTimeFormatter, Duration, ZonedDateTime } from "@js-joda/core";
import { z } from "zod";

export async function parseGameReport(input: unknown) {
  const result = await InputSchema.safeParseAsync(input);
  if (!result.success) {
    return;
  }

  const data = result.data;
  return {
    startedAt: data.startedAt,
    durationInMinutes: Duration.between(
      data.finishedAt,
      data.startedAt,
    ).toMinutes(),
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

const zodInstant = z
  .string()
  .transform((d) => ZonedDateTime.parse(d, DateTimeFormatter.ISO_INSTANT));

const InputSchema = z.object({
  gameId: z.string(),
  startedAt: zodInstant,
  finishedAt: zodInstant,
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

function arrangePlayer(input: z.infer<typeof InputSchema>["players"][0]) {
  return {
    name: input.name,
    honor: input.honor,
    faction: input.faction,
    lostProvinces: input.lostProvinces,
    deck: {
      stronghold: input.deck.stronghold,
      role: input.deck.role,
      provinceCards: input.deck.provinceCards,
      conflictCards: input.deck.conflictCards.map(arrangeMultiCard),
      dynastyCards: input.deck.dynastyCards.map(arrangeMultiCard),
    },
  };
}

function arrangeMultiCard(input: string) {
  const [n, card] = input.split("x ");
  return {
    count: parseInt(n, 10),
    card,
  };
}
