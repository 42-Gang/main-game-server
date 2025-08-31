import { Socket } from 'socket.io';
import TournamentService from './tournament.service.js';

type NextFunction = (err?: Error) => void;

export async function tournamentMiddleware(socket: Socket, next: NextFunction) {
  const logger = socket.nsp.server.logger;

  try {
    const tournamentId = socket.handshake.query.tournamentId;
    if (!tournamentId || Array.isArray(tournamentId)) {
      logger.error('Invalid tournament ID format');
      return next(new Error('Invalid tournament ID format'));
    }

    const userId = socket.data.userId;
    if (!userId) {
      logger.error('User ID is required');
      return next(new Error('User ID is required'));
    }

    const { diContainer } = socket.nsp.server;
    const tournamentService = diContainer.resolve<TournamentService>('tournamentService');

    const parsedTournamentId = parseInt(tournamentId);
    if (isNaN(parsedTournamentId)) {
      logger.error('Invalid tournament ID');
      return next(new Error('Invalid tournament ID'));
    }

    if (!(await tournamentService.isUserParticipant(parsedTournamentId, userId))) {
      logger.error(`User ${userId} is not a participant in tournament ${parsedTournamentId}`);
      return next(new Error('User is not a participant in this tournament'));
    }

    socket.data.tournamentId = parsedTournamentId;
    next();
  } catch (e) {
    logger.error(e, 'Socket middleware error');
    next(e as Error);
  }
}
