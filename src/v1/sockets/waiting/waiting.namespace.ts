import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { autoJoinSchemaType, autoLeaveSchemaType } from './schemas/auto-game.schema.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { WAITING_SOCKET_EVENTS } from './waiting.event.js';
import { FastifyBaseLogger } from 'fastify';
import AutoSocketHandler from './handlers/auto.socket.handler.js';
import CustomSocketHandler from './handlers/custom.socket.handler.js';
import { context, propagation } from '@opentelemetry/api';
import { withTracing } from '../utils/tracing.helper.js';

function registerAutoEvents(socket: Socket, handler: AutoSocketHandler, logger: FastifyBaseLogger) {
  socket.on(
    WAITING_SOCKET_EVENTS.AUTO.JOIN,
    socketErrorHandler(socket, logger, async (payload: autoJoinSchemaType) => {
      await handler.joinAutoRoom(socket, payload);
    }),
  );

  socket.on(
    WAITING_SOCKET_EVENTS.AUTO.LEAVE,
    socketErrorHandler(socket, logger, async (payload: autoLeaveSchemaType) => {
      await handler.leaveAutoRoom(socket, payload);
    }),
  );
}

function registerCustomEvents(
  socket: Socket,
  handler: CustomSocketHandler,
  logger: FastifyBaseLogger,
) {
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.CREATE,
    socketErrorHandler(socket, logger, async (payload) => {
      await handler.createCustomRoom(socket, payload);
    }),
  );
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.INVITE,
    socketErrorHandler(socket, logger, async (payload) => {
      await handler.inviteCustomRoom(socket, payload);
    }),
  );

  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.ACCEPT,
    socketErrorHandler(socket, logger, async (payload) => {
      await handler.acceptCustomRoom(socket, payload);
    }),
  );

  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.START,
    socketErrorHandler(socket, logger, async (payload) => {
      await handler.startCustomRoom(socket, payload);
    }),
  );

  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.LEAVE,
    socketErrorHandler(socket, logger, async () => {
      await handler.leaveRoom(socket);
    }),
  );
}

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);
  namespace.use(async (socket: Socket, next: (err?: Error) => void) => {
    const parentCtx = propagation.extract(context.active(), socket.request.headers);
    await withTracing(
      'ws.waiting.connection',
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
    const autoSocketHandler: AutoSocketHandler =
      namespace.server.diContainer.resolve('autoSocketHandler');
    const customSocketHandler: CustomSocketHandler =
      namespace.server.diContainer.resolve('customSocketHandler');
    const socketCache: SocketCache = namespace.server.diContainer.resolve('socketCache');
    const logger = namespace.server.logger;
    const userId = socket.data.userId;

    const parentCtx = propagation.extract(context.active(), socket.request.headers);
    await socketCache.setSocketId({
      namespace: 'waiting',
      socketId: socket.id,
      userId: userId,
    });
    const childLogger = logger.child({
      namespace: 'waiting',
      socketId: socket.id,
      userId: userId,
    });
    childLogger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);

    socket.use(async (packet, next) => {
      logger.info(packet, '🟢 [/waiting] Socket middleware packet');
      const eventType = packet[0];

      await withTracing(
        eventType,
        {
          attributes: {
            namespace: socket.nsp.name,
            socketId: socket.id,
            userId,
            eventType,
          },
        },
        parentCtx,
        async () => next(),
      );
    });

    registerAutoEvents(socket, autoSocketHandler, childLogger);
    registerCustomEvents(socket, customSocketHandler, childLogger);

    socket.on('disconnect', async () => {
      await withTracing(
        'ws.waiting.disconnect',
        {
          attributes: {
            userId,
            socketId: socket.id,
            eventType: 'disconnect',
          },
        },
        parentCtx,
        async (span) => {
          span.setAttribute('userId', userId);
          span.setAttribute('socketId', socket.id);
          span.setAttribute('eventType', 'disconnect');
          try {
            childLogger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
            await socketCache.deleteSocketId({
              namespace: 'waiting',
              userId: userId,
            });

            await autoSocketHandler.leaveAllAutoRooms(socket);
            await customSocketHandler.leaveRoom(socket);

            span.end();
          } catch (error) {
            childLogger.error(
              `Error during disconnect for socket ${socket.id} and user ${userId}: ${error instanceof Error ? error.message : error}`,
            );
          }
        },
      );

      socket.on('error', (error: Error) => {
        childLogger.info(`Error in waiting namespace: ${error.message}`);
      });
    });
  });
}
