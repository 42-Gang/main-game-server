import { PrismaClient, Prisma, Match } from '@prisma/client';
import MatchRepositoryInterface from '../interfaces/match.repository.interface.js';

export default class MatchRepository implements MatchRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.MatchCreateInput, tx?: Prisma.TransactionClient): Promise<Match> {
    const client = tx || this.prisma;
    return client.match.create({ data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.match.delete({ where: { id } });
  }

  findAll(): Promise<Match[]> {
    return this.prisma.match.findMany();
  }

  findById(id: number): Promise<Match | null> {
    return this.prisma.match.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.MatchUpdateInput, tx?: Prisma.TransactionClient): Promise<Match> {
    const client = tx || this.prisma;
    return client.match.update({ where: { id }, data });
  }

  async findManyByTournamentIdAndRound(
    tournamentId: number,
    round: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Match[]> {
    const client = tx || this.prisma;
    return client.match.findMany({
      where: {
        tournament: {
          id: tournamentId,
        },
        round: round,
      },
    });
  }

  async findManyByTournamentId(
    tournamentId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Match[]> {
    const client = tx || this.prisma;
    return client.match.findMany({
      where: {
        tournament: {
          id: tournamentId,
        },
      },
    });
  }

  async findFinishedMatchesByUserInDuel(userId: number): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: {
        status: 'FINISHED',
        tournament: { size: 2 },
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: { id: 'desc' },
    });
  }

  async countWinsLossesInDuelByUser(userId: number): Promise<{ wins: number; losses: number }> {
    const [wins, losses] = await Promise.all([
      this.prisma.match.count({
        where: {
          status: 'FINISHED',
          tournament: { size: 2 },
          winner: userId,
        },
      }),
      this.prisma.match.count({
        where: {
          status: 'FINISHED',
          tournament: { size: 2 },
          OR: [{ player1Id: userId }, { player2Id: userId }],
          winner: { not: null },
          NOT: { winner: userId },
        },
      }),
    ]);

    return { wins, losses };
  }
}
