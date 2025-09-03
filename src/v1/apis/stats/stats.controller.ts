import { FastifyReply, FastifyRequest } from 'fastify';
import StatsService from './stats.service.js';
import {
  StatsModeEnum,
  ZGetDuelStatsResponse,
  ZGetStatsParams,
  ZGetStatsQuery,
  ZGetTournamentStatsResponse,
} from './schemas/game.stats.schema.js';
import { STATUS } from '../../common/constants/status.js';
import { BadRequestException } from '../../common/exceptions/core.error.js';

export default class StatsController {
  constructor(private readonly statsService: StatsService) {}

  getStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = ZGetStatsQuery.parse(request.query);
    const params = ZGetStatsParams.parse(request.params);
    const mode = query.mode;
    const userId = params.userId;

    let data;
    let responseSchema;

    if (mode === StatsModeEnum.DUEL) {
      data = await this.statsService.getDuelStats(userId);
      responseSchema = ZGetDuelStatsResponse;
    } else if (mode === StatsModeEnum.TOURNAMENT) {
      data = await this.statsService.getTournamentStats(userId);
      responseSchema = ZGetTournamentStatsResponse;
    } else {
      throw new BadRequestException('Invalid mode parameter');
    }

    const body = {
      status: STATUS.SUCCESS,
      code: 200,
      message: 'Request processed successfully',
      data,
    };
    return reply.code(200).send(responseSchema.parse(body));
  };
}
