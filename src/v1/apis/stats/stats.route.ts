import { FastifyInstance } from 'fastify';
import { addRoutes, Route } from '../../../plugins/router.js';
import { ZGetStatsParams, ZGetStatsQuery, ZGetStatsResponse } from './schemas/game.stats.schema.js';
import StatsController from './stats.controller.js';

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
            200: ZGetStatsResponse,
          },
        },
      },
    },
  ];

  await addRoutes(fastify, routes);
}
