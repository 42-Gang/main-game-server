import { FastifyInstance } from 'fastify';

import gameRoutes from './apis/game/games.route.js';
import statsRoutes from './apis/stats/stats.route.js';

export default async function routeV1(fastify: FastifyInstance) {
  fastify.register(gameRoutes, { prefix: '/' });
  fastify.register(statsRoutes, { prefix: '/stats' });
}
