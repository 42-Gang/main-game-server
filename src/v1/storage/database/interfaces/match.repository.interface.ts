import { BaseRepositoryInterface } from './base.repository.interface.js';
import { Match, Prisma } from '@prisma/client';

export default interface MatchRepositoryInterface
  extends BaseRepositoryInterface<Match, Prisma.MatchCreateInput, Prisma.MatchUpdateInput> {
  findManyByTournamentIdAndRound(
    tournamentId: number,
    round: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Match[]>;

  // 특정 토너먼트의 모든 매치 조회
  findManyByTournamentId(tournamentId: number, tx?: Prisma.TransactionClient): Promise<Match[]>;

  // 듀얼(토너먼트 사이즈 2)에서 특정 유저가 참여하고 종료된 매치 조회 (최근순)
  findFinishedMatchesByUserInDuel(userId: number): Promise<Match[]>;

  // 듀얼에서 특정 유저의 승/패 수 집계
  countWinsLossesInDuelByUser(userId: number): Promise<{ wins: number; losses: number }>;
}
