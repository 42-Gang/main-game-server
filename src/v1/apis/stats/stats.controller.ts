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

export default class StatsController {
  constructor(private readonly statsService: StatsService) {}

  getStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = ZGetStatsQuery.parse(request.query);
    const params = ZGetStatsParams.parse(request.params);
    const mode = query.mode;
    const userId = params.userId;

    if (mode === StatsModeEnum.DUEL) {
      const data = await this.statsService.getDuelStats(userId);
      const body = {
        status: STATUS.SUCCESS,
        code: 200,
        message: 'Request processed successfully',
        data,
      };
      return reply.code(200).send(ZGetDuelStatsResponse.parse(body));
    }

    const data = await this.statsService.getTournamentStats(userId);
    const body = {
      status: STATUS.SUCCESS,
      code: 200,
      message: 'Request processed successfully',
      data,
    };
    return reply.code(200).send(ZGetTournamentStatsResponse.parse(body));
  };
}
