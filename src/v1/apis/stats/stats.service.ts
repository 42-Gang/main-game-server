import MatchRepository from '../../storage/database/prisma/match.repository.js';
import TournamentRepository from '../../storage/database/prisma/tournament.repository.js';
import UserServiceClient from '../../client/user.service.client.js';
import { FastifyBaseLogger } from 'fastify';
import {
  DuelData,
  TournamentData,
  ZDuelData,
  ZTournamentData,
  UserMini,
} from './schemas/game.stats.schema.js';
import { Match, Player } from '@prisma/client';
import { TournamentWithPlayers } from '../../storage/database/interfaces/tournament.repository.interface.js';
import { InternalServerException } from '../../common/exceptions/core.error.js';

export default class StatsService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly tournamentRepository: TournamentRepository,
    private readonly userServiceClient: UserServiceClient,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private async getUserMiniCached(cache: Map<number, UserMini>, userId: number): Promise<UserMini> {
    if (cache.has(userId)) return cache.get(userId)!;
    try {
      const user = await this.userServiceClient.getUserInfo(userId);
      const mini: UserMini = { id: user.id, nickname: user.nickname };
      cache.set(userId, mini);
      return mini;
    } catch (e) {
      this.logger.error(e, `Failed to fetch user info for ${userId}, using fallback`);
      const mini: UserMini = { id: userId, nickname: String(userId) };
      cache.set(userId, mini);
      return mini;
    }
  }

  async getDuelStats(userId: number): Promise<DuelData> {
    const [{ wins, losses }, matches] = await Promise.all([
      this.matchRepository.countWinsLossesInDuelByUser(userId),
      this.matchRepository.findFinishedMatchesByUserInDuel(userId),
    ]);

    const userCache = new Map<number, UserMini>();

    const history = await Promise.all(
      matches.map(async (match: Match) => {
        if (!match.player1Id || !match.player2Id) {
          throw new InternalServerException('Match is missing player1Id or player2Id');
        }
        const [p1, p2] = await Promise.all([
          this.getUserMiniCached(userCache, match.player1Id),
          this.getUserMiniCached(userCache, match.player2Id),
        ]);
        return {
          date: match.createdAt.toISOString(),
          player1: p1,
          player2: p2,
          result: {
            winnerId: match.winner,
            scores: {
              player1: match.player1Score,
              player2: match.player2Score,
            },
          },
        };
      }),
    );

    const data: DuelData = {
      mode: 'duel',
      summary: { wins: wins ?? 0, losses: losses ?? 0 },
      history,
    } as DuelData;

    return ZDuelData.parse(data);
  }

  async getTournamentStats(userId: number): Promise<TournamentData> {
    const [tournaments, wins] = await Promise.all([
      this.tournamentRepository.findTournamentsByUser(userId),
      this.tournamentRepository.countTournamentWinsByUser(userId),
    ]);

    const userCache = new Map<number, UserMini>();

    const history = await Promise.all(
      tournaments.map(async (tournament: TournamentWithPlayers) => {
        const participantIds = tournament.players.map((player: Player) => player.userId);
        const participants = await Promise.all(
          participantIds.map((pid: number) => this.getUserMiniCached(userCache, pid)),
        );
        return {
          tournamentId: tournament.id,
          rounds: tournament.size,
          participants,
          myResult: tournament.winnerId === userId ? 'WIN' : 'LOSS',
        };
      }),
    );

    const losses = Math.max(0, (tournaments?.length ?? 0) - (wins ?? 0));

    const data: TournamentData = {
      mode: 'tournament',
      summary: { wins: wins ?? 0, losses },
      history,
    } as TournamentData;

    return ZTournamentData.parse(data);
  }
}
