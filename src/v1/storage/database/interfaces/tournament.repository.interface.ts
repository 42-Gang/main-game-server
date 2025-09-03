import { Prisma, Tournament } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface.js';

export type TournamentWithPlayers = Prisma.TournamentGetPayload<{
  include: {
    players: true;
  };
}>;

export default interface TournamentRepositoryInterface
  extends BaseRepositoryInterface<
    Tournament,
    Prisma.TournamentCreateInput,
    Prisma.TournamentUpdateInput
  > {
  // 특정 유저가 참가한 모든 토너먼트 조회
  findTournamentsByUser(userId: number): Promise<TournamentWithPlayers[]>;

  // 특정 유저가 참가한 모든 1:1 토너먼트 조회
  findDuelTournamentsByUser(userId: number): Promise<TournamentWithPlayers[]>;

  // 특정 유저의 토너먼트 우승 횟수
  countTournamentWinsByUser(userId: number): Promise<number>;
}
