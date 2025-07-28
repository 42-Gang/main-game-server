import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { tournamentMiddleware } from './tournament.middleware.js';
import { TOURNAMENT_SOCKET_EVENTS } from './tournament.event.js';
import TournamentSocketHandler from './handlers/tournament.socket.handler.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { context, propagation } from '@opentelemetry/api';
import { withTracing } from '../utils/tracing.helper.js';

export function startTournamentNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);
  namespace.use(tournamentMiddleware);
  namespace.use(async (socket: Socket, next) => {
    const parentCtx = propagation.extract(context.active(), socket.request.headers);
    await withTracing(
      'ws.tournament.connection',
      {
        attributes: {
          namespace: socket.nsp.name,
          socketId: socket.id,
        },
      },
      parentCtx,
      async () => next(),
    );
  });

  namespace.on('connection', async (socket: Socket) => {
    const diContainer = namespace.server.diContainer;

    const socketCache: SocketCache = diContainer.resolve('socketCache');
    const tournamentSocketHandler: TournamentSocketHandler =
      diContainer.resolve('tournamentSocketHandler');

    const logger = namespace.server.logger;
    const userId = socket.data.userId;
    const tournamentId = socket.data.tournamentId;

    try {
      await socketCache.setSocketId({
        namespace: 'tournament',
        socketId: socket.id,
        userId: userId,
      });
      await tournamentSocketHandler.sendBracket(socket);
      socket.join(`tournament:${tournamentId}`);
      await tournamentSocketHandler.sendTournamentInfo(socket);

      logger.info(`🟢 [/tournament] Connected: ${socket.id} ${userId}`);
    } catch (error) {
      logger.error(error, `Error setting socket ID for user ${userId} in tournament namespace`);
      return;
    }

    socket.use(async (packet, next) => {
      const eventType = packet[0];

      await withTracing(
        eventType,
        {
          attributes: {
            namespace: socket.nsp.name,
            socketId: socket.id,
            userId: userId,
          },
        },
        context.active(),
        async () => next(),
      );
    });

    socket.on(
      TOURNAMENT_SOCKET_EVENTS.READY,
      socketErrorHandler(socket, logger, async () => {
        logger.info(`🟢 [/tournament] User ${userId} is ready`);
        await tournamentSocketHandler.handleReady(socket);
      }),
    );

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      socketCache.deleteSocketId({
        namespace: 'tournament',
        userId: userId,
      });
    });
  });
}
