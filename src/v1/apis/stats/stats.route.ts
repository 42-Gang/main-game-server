import { FastifyInstance } from 'fastify';
import { addRoutes, Route } from '../../../plugins/router.js';
import {
  ZGetDuelStatsResponse,
  ZGetStatsParams,
  ZGetStatsQuery,
  ZGetTournamentStatsResponse,
} from './schemas/game.stats.schema.js';
import StatsController from './stats.controller.js';
import { z } from 'zod';

export default async function statsRoutes(fastify: FastifyInstance) {
  const gameStatsController: StatsController = fastify.diContainer.resolve('statsController');

  const routes: Array<Route> = [
    {
      method: 'GET',
      url: '/:userId',
      handler: gameStatsController.getStats,
      options: {
        auth: true,
        description: 'Get game stats by user and mode (duel | tournament)',
        schema: {
          querystring: ZGetStatsQuery,
          params: ZGetStatsParams,
          response: {
            200: z.union([ZGetDuelStatsResponse, ZGetTournamentStatsResponse]),
          },
        },
      },
    },
  ];

  await addRoutes(fastify, routes);
}
