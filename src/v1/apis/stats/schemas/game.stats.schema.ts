import { z } from 'zod';
import { createResponseSchema } from '../../../common/schema/core.schema.js';

export const ZUserMini = z.object({
  id: z.number().int().nonnegative(),
  nickname: z.string().min(1),
});

export const ZSummary = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
});

export const ZDuelResult = z.object({
  winnerId: z.number().int().nonnegative(),
  scores: z.object({
    player1: z.number().int().min(0),
    player2: z.number().int().min(0),
  }),
});

export const ZDuelHistoryItem = z.object({
  date: z.string().datetime(),
  player1: ZUserMini,
  player2: ZUserMini,
  result: ZDuelResult,
});

export const ZDuelData = z.object({
  mode: z.literal('duel'),
  summary: ZSummary,
  history: z.array(ZDuelHistoryItem),
});

export const ZTournamentHistoryItem = z.object({
  tournamentId: z.number().int().positive(),
  rounds: z.number().int().positive(),
  participants: z.array(ZUserMini).min(1),
  myResult: z.enum(['WIN', 'LOSS']),
});

export const ZTournamentData = z.object({
  mode: z.literal('tournament'),
  summary: ZSummary,
  history: z.array(ZTournamentHistoryItem),
});

export const ZGetDuelStatsResponse = createResponseSchema(ZDuelData);
export const ZGetTournamentStatsResponse = createResponseSchema(ZTournamentData);

export enum StatsModeEnum {
  DUEL = 'duel',
  TOURNAMENT = 'tournament',
}
export const ZGetStatsQuery = z.object({ mode: z.nativeEnum(StatsModeEnum) });
export const ZGetStatsParams = z.object({
  userId: z.preprocess((val) => Number(val), z.number().int().nonnegative()),
});

export type UserMini = z.infer<typeof ZUserMini>;
export type DuelData = z.infer<typeof ZDuelData>;
export type TournamentData = z.infer<typeof ZTournamentData>;
